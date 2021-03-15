const fetcher = require('./fetcher')
const math = require('./math')

const uniswapRouterAbi = require('./config/abis/uniswapRouter.json')
const wethAbi = require('./config/abis/weth.json')
const tokens = require('./config/tokens.json')
const pools = require('./config/pools.json')
const paths = require('./config/paths.json')

const resolve = require('path').resolve
const ethers = require('ethers')
const fs = require('fs')

const MIN_PROFIT = ethers.utils.parseUnits("0")
const WAVAX_MAX_BAL = "100";
const ROUTER_ADDRESS = "0x85995d5f8ee9645cA855e92de16FA62D26398060";
const GAS_LIMIT = "400000";
const MAX_GAS_COST = ethers.utils.parseUnits("0.5")
const GAS_PRICE = ethers.BigNumber.from("470")

var RUNWAY_CLEAR = true;
var FAILED_TX_IN_A_ROW = 0;
const MAX_CONSECUTIVE_FAILS = 5;
const BLOCK_WAIT = 2

// BEST_PROFIT = ethers.constants.Zero
// OPPS_FOUND = 0
var LAST_BLOCK = 0
var AVAX_BALANCE
var WAVAX_BALANCE
var ROUTER_CONTRACT, WAVAX_CONTRACT, SIGNER, PROVIDER;

async function initialize(provider, signer) {
    SIGNER = signer
    PROVIDER = provider
    ROUTER_CONTRACT = new ethers.Contract(
        ROUTER_ADDRESS,
        uniswapRouterAbi,
        signer
    )
    WAVAX_CONTRACT = new ethers.Contract(
        tokens.filter(t=>t.id=='T0000')[0].address,
        wethAbi,
        signer
    )
    AVAX_BALANCE = await provider.getBalance(signer.address);
    WAVAX_BALANCE = await getWAVAXBalance();
    fetcher.initialize(provider)
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

function findArbs(reservesAll) {
    let inputAsset = 'T0000'
    let opps = []
    for (path of paths) {
        let { tkns: tknPath, pools: poolsPath } = path
        let pathFull = poolsPath.map(step => {
            return {
                tkns: pools.filter(p=>p.id==step)[0].tkns.map(t=>t.id),
                reserves: reservesAll[step]
            }
        })
        let optimalIn = math.getOptimalAmountForPath(inputAsset, pathFull);
        if (optimalIn.gt("0")) {
            let avlAmount = WAVAX_BALANCE.sub(MAX_GAS_COST)
            let amountIn = avlAmount.gt(optimalIn) ? optimalIn : avlAmount
            let amountOut = math.getAmountOutByPath(inputAsset, amountIn, pathFull)
            let profit = amountOut.sub(amountIn)
            let gasCost = ethers.utils.parseUnits(GAS_PRICE.mul(path.gasAmount).toString(), 'gwei')
            let netProfit = profit.sub(gasCost);
            if (netProfit.gt("0")) {
                opps.push({ profit, amountIn, tknPath, gasCost, netProfit });
    
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

// async function unwrapAvax(amount, blockNumber) {
//     let tx = await WAVAX_CONTRACT.withdraw(amount);
//     console.log(`${blockNumber} | ${Date.now()} | Unwrap sent ${tx.nonce}, ${tx.hash}`)
//     let txReceipt = await PROVIDER.waitForTransaction(tx.hash, BLOCK_WAIT);
//     if (txReceipt.status == 0) {
//         console.log(`${blockNumber} | ${Date.now()} | ❌ Unwrap fail: ${txReceipt.transactionHash}`);
//     }
//     else if (txReceipt.status == 1) {
//         console.log(`${blockNumber} | ${Date.now()} | ✅ Unwrap success: ${txReceipt.transactionHash}`);
//     }
// }

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

async function findBestOpp() {
    let startTime = new Date();
    let bestOpp
    let reservesAll = await fetcher.fetchReservesAll()
    console.log(`debug::findBestOpp::timing 1: ${new Date() - startTime}ms`);
    // saveReserves(reservesAll, './logs/reservesByBlock.json', LAST_BLOCK)
    let opps = findArbs(reservesAll)
    console.log(`debug::findBestOpp::timing 2: ${new Date() - startTime}ms`);
    opps.forEach(o => {
        if ((!bestOpp && o.netProfit.gt(MIN_PROFIT)) || (bestOpp && o.netProfit.gt(bestOpp.netProfit))) {
            bestOpp = {
                inputAmount: o.amountIn,
                grossProfit: o.profit, 
                netProfit: o.netProfit, 
                path: o.tknPath
            }
        }
    })
    console.log(`debug::findBestOpp::timing 3: ${new Date() - startTime}ms`);
    return bestOpp
}

async function submitTradeTx(blockNumber, opp) {
    let startTime = new Date();
    let tknAddressPath = opp.path.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await ROUTER_CONTRACT.swapExactTokensForTokens(
        opp.inputAmount,
        opp.inputAmount,
        tknAddressPath,
        SIGNER.address,
        Date.now()+180,
        { gasLimit: GAS_LIMIT }
    )
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)

    let txReceipt = await PROVIDER.waitForTransaction(tx.hash, BLOCK_WAIT);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Fail: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        FAILED_TX_IN_A_ROW += 1;
        if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
            console.log("Shutting down... too many failed tx");
            process.exit(0);
        }
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Success: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        FAILED_TX_IN_A_ROW = 0;
    }
} 

async function handleNewBlock(blockNumber) {
    let startTime = new Date();
    // If there is a block still being processed already skip it
    if (!RUNWAY_CLEAR) {
        console.log(`${blockNumber} | Still checking opportunity, ignoring block`)
        return;
    } else if (LAST_BLOCK >= blockNumber) {
        console.log(`${blockNumber} | Stale, ignoring block`);
        return;
    }
    RUNWAY_CLEAR = false // Close the doors
    
    LAST_BLOCK = blockNumber
    let bestOpp = await findBestOpp()
    if (bestOpp) {
        let gasCost = bestOpp.grossProfit.sub(bestOpp.netProfit)
        console.log(`${blockNumber} | ${Date.now()} | 🕵️‍♂️ ARB AVAILABLE | AVAX ${ethers.utils.formatUnits(bestOpp.inputAmount)} -> WAVAX ${ethers.utils.formatUnits(bestOpp.inputAmount.add(bestOpp.netProfit))}`)
        console.log(`Gas cost: ${ethers.utils.formatUnits(gasCost)} | Gross profit: ${ethers.utils.formatUnits(bestOpp.grossProfit)}`)
        // send tx
        console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... ${ethers.utils.formatUnits(bestOpp.inputAmount)} for ${ethers.utils.formatUnits(bestOpp.netProfit)}`);
        try {
            await submitTradeTx(blockNumber, bestOpp)
        } catch (error) {
            console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
        }
    }
    // Do you want to unwrap avax?
    let wavaxBalance = await getWAVAXBalance();
    // if (wavaxBalance.gt(ethers.utils.parseUnits(WAVAX_MAX_BAL))) {
    //     RUNWAY_CLEAR = false // disable tx (try to avoid fails)
    //     console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... Unwrapping ${ethers.utils.formatUnits(wavaxBalance)} WAVAX`);
    //     try {
    //         await unwrapAvax(wavaxBalance, blockNumber);
    //     }
    //     catch (error) {
    //         console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
    //     }
    //     RUNWAY_CLEAR = true;
    // }
    RUNWAY_CLEAR = true;
    LAST_BLOCK = blockNumber

    let endTime = new Date();
    let processingTime = endTime - startTime;
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)

    // Update balance (not time sensitive)
    let balance = await PROVIDER.getBalance(SIGNER.address);
    WAVAX_BALANCE = wavaxBalance
    console.log(`ZERO-EXCHANGE | ${blockNumber} | AVAX: ${ethers.utils.formatUnits(balance)} | WAVAX: ${ethers.utils.formatUnits(wavaxBalance)}`);
}

module.exports = { initialize, handleNewBlock, findArbs, getWAVAXBalance }