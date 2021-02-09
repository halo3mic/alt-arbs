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

const WAVAX_MAX_BAL = "800";
const ROUTER_ADDRESS = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106";
const GAS_LIMIT = "400000";
const BOT_BAL = ethers.utils.parseUnits('3000');

var RUNWAY_CLEAR = true;
var FAILED_TX_IN_A_ROW = 0;
const MAX_CONSECUTIVE_FAILS = 5;


var LAST_BLOCK = 0

var ROUTER_CONTRACT, WAVAX_CONTRACT, SIGNER, PROVIDER;


function initialize() {

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
            let amountIn = BOT_BAL.gt(optimalIn) ? optimalIn : BOT_BAL
            let amountOut = math.getAmountOutByPath(inputAsset, amountIn, pathFull)
            let profit = amountOut.sub(amountIn)
            let gasCost = estimateGasCost(pathFull.length - 1);
            let netProfit = profit.sub(gasCost);
            if (netProfit.gt("0")) {
                opps.push({ profit, amountIn, tknPath, gasCost, netProfit });
    
                console.log('_'.repeat(50));
                console.log(tknPath);
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

async function unwrapAvax(amount, blockNumber) {
    let tx = await WAVAX_CONTRACT.withdraw(amount);
    console.log(`${blockNumber} | ${Date.now()} | Unwrap sent ${tx.nonce}, ${tx.hash}`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Unwrap fail: ${txReceipt.transactionHash}`);
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Unwrap success: ${txReceipt.transactionHash}`);
    }
}



module.exports = { initialize, handleNewBlock, findArbs, unwrapAvax, getWAVAXBalance }