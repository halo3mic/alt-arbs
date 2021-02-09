const pools = require('./config/pools.json')
const paths = require('./config/paths.json')
const fetcher = require('./fetcher')
const math = require('./math')
const ethers = require('ethers')
const config = require('./config')

// var RUNWAY_CLEAR = true;
// var FAILED_TX_IN_A_ROW = 0;
// const MAX_CONSECUTIVE_FAILS = 5;

// var LAST_BLOCK = 0

var ROUTER_CONTRACT, WAVAX_CONTRACT, SIGNER, PROVIDER;


function initialize(provider, signer) {
    fetcher.initialize(provider)
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
    let gasPerStep = ethers.BigNumber.from("62000")
    let totalGas = gasToUnwrap.add(gasPerStep.mul(nSteps))
    let total = ethers.utils.parseUnits((gasPrice.mul(totalGas)).toString(), "gwei")
    return total
}


function findArbs(reservesAll) {
    let inputAsset = config.BASE_ASSET
    let opps = []
    for (path of paths) {
        let { tkns: tknPath, pools: poolsPath } = path
        if (tknPath[0]!=inputAsset || tknPath[tknPath.length-1]!=inputAsset) {
            continue
        }
        let pathFull = poolsPath.map(step => {
            return {
                tkns: pools.filter(p=>p.id==step)[0].tkns.map(t=>t.id),
                reserves: reservesAll[step]
            }
        })
        let optimalIn = math.getOptimalAmountForPath(inputAsset, pathFull);
        if (optimalIn.gt("0")) {
            let amountIn = BOT_BAL.gt(optimalIn) ? optimalIn : BOT_BAL
            let amountOut = math.getAmountOutByPath(inputAsset, amountIn, pathFull)
            let pathAmounts = math.getAllAmountsForPath(inputAsset, amountIn, pathFull)
            console.log(pathAmounts)
            let profit = amountOut.sub(amountIn)
            let gasCost = estimateGasCost(pathFull.length - 1);
            let netProfit = profit.sub(gasCost);
            if (netProfit.gt("0")) {
                opps.push({ profit, amountIn, tknPath, gasCost, netProfit, pathAmounts });
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

async function findBestOpp() {
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
                inputAmount: o.amountIn,
                grossProfit: o.profit, 
                netProfit: o.netProfit, 
                path: o.tknPath, 
                pathAmounts: o.pathAmounts
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
        console.log(`${blockNumber} | ${Date.now()} | 🕵️‍♂️ ARB AVAILABLE | AVAX ${ethers.utils.formatUnits(bestOpp.inputAmount)} -> WAVAX ${ethers.utils.formatUnits(bestOpp.inputAmount.add(bestOpp.netProfit))}`)
        console.log(`Gas cost: ${ethers.utils.formatUnits(gasCost)} | Gross profit: ${ethers.utils.formatUnits(bestOpp.grossProfit)}`)
        // send tx
        if (RUNWAY_CLEAR) {
            RUNWAY_CLEAR = false // disable tx (try to avoid fails)
            console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... ${ethers.utils.formatUnits(bestOpp.inputAmount)} for ${ethers.utils.formatUnits(bestOpp.netProfit)}`);
            try {
                await submitTradeTx(blockNumber, bestOpp)
            }
            catch (error) {
                console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
            }
            RUNWAY_CLEAR = true;
        }
    }
    else {
        // There is no arb, do you want to unwrap avax?
        let wavaxBalance = await getWAVAXBalance();
        if (wavaxBalance.gt(ethers.utils.parseUnits(WAVAX_MAX_BAL))) {
            RUNWAY_CLEAR = false // disable tx (try to avoid fails)
            console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... Unwrapping ${ethers.utils.formatUnits(wavaxBalance)} WAVAX`);
            try {
                await unwrapAvax(wavaxBalance, blockNumber);
            }
            catch (error) {
                console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
            }
            RUNWAY_CLEAR = true;
        }
    }

    let endTime = new Date();
    let processingTime = endTime - startTime;
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)

    // Update balance (not time sensitive)
    let balance = await PROVIDER.getBalance(SIGNER.address);
    let wavaxBalance = await getWAVAXBalance();
    console.log(`${blockNumber} | AVAX: ${ethers.utils.formatUnits(balance)} | WAVAX: ${ethers.utils.formatUnits(wavaxBalance)}`);
}


module.exports = { findBestOpp, initialize }