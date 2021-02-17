const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const paths = require('./config/paths.json')
const wethAbi = require('./config/abis/weth.json')
const fetcher = require('./fetcher')
const math = require('./math')
const ethers = require('ethers')
const config = require('./config')
const txMng = require('./txManager')
const fs = require('fs')
const os = require('os')
const csvWriter = require('csv-write-stream')

var RUNWAY_CLEAR = true;
var FAILED_TX_IN_A_ROW = 0;
const MAX_CONSECUTIVE_FAILS = 5;
const SAVE_PATH = './logs/opportunities.csv'
// var LAST_BLOCK = 0
const MAX_GAS_COST = ethers.utils.parseUnits("0.5")
var ROUTER_CONTRACT, WAVAX_CONTRACT, SIGNER, PROVIDER, HOST_NAME


function initialize(provider, signer) {
    PROVIDER = provider
    SIGNER = signer
    HOST_NAME = os.hostname()
    fetcher.initialize(provider)
    txMng.initialize(provider, signer)
    WAVAX_CONTRACT = new ethers.Contract(
        tokens.filter(t=>t.id=='T0000')[0].address,
        wethAbi,
        signer
        )
}

function logToCsv(data, path) {
    if (!Array.isArray(data)) {
        data = [data]
    }
    let writer = csvWriter()
    let headers = {sendHeaders: false}
    if (!fs.existsSync(path))
        headers = {headers: Object.keys(data[0])}
    writer = csvWriter(headers);
    writer.pipe(fs.createWriteStream(path, {flags: 'a'}));
    data.forEach(e => writer.write(e))
    writer.end()
}

function saveReserves(reservesNew, path, blockNumber) {
    try {
        let absScrtsPath = resolve(`${__dirname}/${path}`)
        let currentSaves = JSON.parse(fs.readFileSync(absScrtsPath, 'utf8'))
        currentSaves[blockNumber] = reservesNew
        fs.writeFileSync(absScrtsPath, JSON.stringify(currentSaves, null, 4))
        return true
    } catch(e) {
        console.log('Couldnt save!')
        console.log(e)
        return 
    }
}

/**
 * Returns WAVAX balance for signer, in wei
 */
async function getWAVAXBalance() {
    return await WAVAX_CONTRACT.balanceOf(SIGNER.address)
}

/**
 * Estimate gas cost for an internal Uniswap trade with nSteps.
 * @dev Gas estimate for wrapping 32k
 * @dev Actual gasPerStep varies. Estimated 62k
 * @dev Avalanche has static gas price (may change in hardfork). Set to 470gwei
 * @param {BigNumber} nSteps 
 * @returns {BigNumber} gas cost in wei
 */
function estimateGasCost(nSteps) {
    let gasPrice = ethers.BigNumber.from("470")
    let gasToUnwrap = ethers.BigNumber.from("32000")
    let gasPerStep = ethers.BigNumber.from("120000")
    let totalGas = gasToUnwrap.add(gasPerStep.mul(nSteps))
    let total = ethers.utils.parseUnits((gasPrice.mul(totalGas)).toString(), "gwei")
    return total
}


function findArbs(reservesAll) {
    let inputAsset = config.BASE_ASSET
    let opps = []
    for (let path of paths) {
        let { tkns: tknPath, pools: poolsPath } = path
        if (tknPath[0]!=inputAsset || tknPath[tknPath.length-1]!=inputAsset || path.enabled!='1' || config.MAX_HOPS<poolsPath.length) {
            // console.log('Skipping(pre-conditions not met)' + path.symbol)
            continue
        }
        let hasEmptyReserve = false
        let pathFull = poolsPath.map(step => {
            // Check if reserves are empty
            let [bal1, bal2] = Object.values(reservesAll[step])
            if (bal1.eq('0') || bal2.eq('0')) {
                hasEmptyReserve = true
            }
            return {
                tkns: pools.filter(p=>p.id==step)[0].tkns.map(t=>t.id),
                reserves: reservesAll[step]
            }
        })
        if (hasEmptyReserve) {
            // console.log('Skipping(empty reserve):' + path.symbol)
            continue
        }
        // console.log('Calculating optimal amount:' + path.symbol)
        let optimalIn = math.getOptimalAmountForPath(inputAsset, pathFull);
        if (optimalIn.gt("0")) {
            let avlAmount = BOT_BAL.sub(MAX_GAS_COST)
            let amountIn = avlAmount.gt(optimalIn) ? optimalIn : avlAmount
            let amountOut = math.getAmountOutByPath(inputAsset, amountIn, pathFull)
            let pathAmounts = math.getAllAmountsForPath(inputAsset, amountIn, pathFull)
            let profit = amountOut.sub(amountIn)
            let gasCost = estimateGasCost(pathFull.length - 1);
            let netProfit = profit.sub(gasCost);
            if (netProfit.gt("0")) {
                opps.push({ 
                    profit, 
                    amountIn, 
                    tknPath, 
                    gasCost, 
                    netProfit, 
                    pathAmounts,
                    pathId: path.id
                });
                console.log('_'.repeat(50));
                console.log(path.symbol);
                console.log('Optimal in:   ', ethers.utils.formatUnits(optimalIn));
                console.log('Amount in:    ', ethers.utils.formatUnits(amountIn));
                console.log('Amount out:   ', ethers.utils.formatUnits(amountOut));
                console.log('Gross profit: ', ethers.utils.formatUnits(profit));
                console.log('Gas cost:     ', ethers.utils.formatUnits(gasCost));
                console.log('Net profit:   ', ethers.utils.formatUnits(netProfit));
                console.log('^'.repeat(50))
            }
        }
    }
    return opps
}

async function findBestOpp(blockNumber) {
    let startTime = new Date();
    let bestOpp
    let reservesAll = await fetcher.fetchReservesAll()
    console.log(`debug::findBestOpp::timing 1: ${new Date() - startTime}ms`);
    // saveReserves(reservesAll, './logs/reservesByBlock.json', LAST_BLOCK)
    let opps = findArbs(reservesAll)
    console.log(`debug::findBestOpp::timing 2: ${new Date() - startTime}ms`);
    opps.forEach(o => {
        if ((!bestOpp && o.netProfit.gt("0")) || (bestOpp && o.netProfit.gt(bestOpp.netProfit))) {
            bestOpp = {
                instrId: o.pathId,
                grossProfit: o.profit, 
                netProfit: o.netProfit, 
                pathAmounts: o.pathAmounts, 
            }
        }
    })
    console.log(`debug::findBestOpp::timing 3: ${new Date() - startTime}ms`);
    return bestOpp
}


async function handleNewBlock(blockNumber) {
    let startTime = new Date();
    if (!RUNWAY_CLEAR) {
        console.log(`${blockNumber} | Tx in flight, ignoring block`)
        return;
    }

    LAST_BLOCK = blockNumber
    let bestOpp = await findBestOpp()
    if (bestOpp) {
        let gasCost = bestOpp.grossProfit.sub(bestOpp.netProfit)
        console.log(`${blockNumber} | ${Date.now()} | 🕵️‍♂️ ARB AVAILABLE | AVAX ${ethers.utils.formatUnits(bestOpp.pathAmounts[0])} -> WAVAX ${ethers.utils.formatUnits(bestOpp.pathAmounts[0].add(bestOpp.netProfit))}`)
        console.log(`Gas cost: ${ethers.utils.formatUnits(gasCost)} | Gross profit: ${ethers.utils.formatUnits(bestOpp.grossProfit)}`)
        // send tx
        if (RUNWAY_CLEAR) {
            RUNWAY_CLEAR = false // disable tx (try to avoid fails)
            console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... ${ethers.utils.formatUnits(bestOpp.pathAmounts[0])} for ${ethers.utils.formatUnits(bestOpp.netProfit)}`);
            try {
                var {ok, txHash, txData, error} = await txMng.executeOpportunity(bestOpp)
                opportunity = {
                    hostname: HOST_NAME,
                    wallet: SIGNER.address,
                    botBalance: config.BOT_BAL, 
                    blockNumber: blockNumber, 
                    timestamp: Date.now(), 
                    instrId: bestOpp.instrId, 
                    pathAmounts: bestOpp.pathAmounts.join('\n'),
                    grossProfit: bestOpp.grossProfit, 
                    netProfit: bestOpp.netProfit,
                    txHash: txHash

                }    
                if (ok) {
                    FAILED_TX_IN_A_ROW = 0;
                } else if (txHash && error) {
                    FAILED_TX_IN_A_ROW += 1;
                    if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
                        console.log("Shutting down... too many failed tx");
                        process.exit(0);
                }
        }
            }
            catch (error) {
                console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
            }
            opportunity.status = ok
            opportunity.txData = txData
            opportunity.error = error
            logToCsv(opportunity, SAVE_PATH)
            RUNWAY_CLEAR = true;
        }
    }
    let endTime = new Date();
    let processingTime = endTime - startTime;
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)
    

    // Update balance (not time sensitive)
    let balance = await PROVIDER.getBalance(SIGNER.address);
    let wavaxBalance = await getWAVAXBalance();
    console.log(`CROSS-DEX | ${blockNumber} | AVAX: ${ethers.utils.formatUnits(balance)} | WAVAX: ${ethers.utils.formatUnits(wavaxBalance)}`);
}


module.exports = { findBestOpp, initialize, handleNewBlock }