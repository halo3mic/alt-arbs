const pools = require('./config/pools.json')
const orgPaths = require('./config/paths.json')
const tokens = require('./config/tokens.json')

const reservesManager = require('./reservesManager')
const math = require('./math')

const ethers = require('ethers')

// TODO: Put this in config
const uniswapRouterAbi = require('./config/abis/uniswapRouter.json')
const wethAbi = require('./config/abis/weth.json')
const MAX_GAS_COST = ethers.BigNumber.from('1')
const GAS_PRICE = ethers.BigNumber.from('470')
const MIN_PROFIT = ethers.BigNumber.from('0')
const ROUTER_ADDRESS = '0x85995d5f8ee9645cA855e92de16FA62D26398060'
const MAX_HOPS = 4
const INPUT_ASSET = 'T0000'
const MAX_CONSECUTIVE_FAILS = 8
const GAS_LIMIT = 600000
const BLOCK_WAIT = 2
const STATIC_INPUT_AMOUNTS = [
    ethers.utils.parseEther('240'), 
    ethers.utils.parseEther('120'), 
    ethers.utils.parseEther('60')
]

let FAILED_TX_IN_A_ROW = 0
let RUNWAY_CLEAR = true
let BOT_BAL
let RESERVES  // Better to be global so it changes if more reserves change
let SIGNER
let PROVIDER
let ROUTER_CONTRACT
let WAVAX_CONTRACT
let paths


async function init(provider, signer) {
    filterPaths()
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
    await reservesManager.init(provider, paths)
    RESERVES = reservesManager.getAllReserves()
    BOT_BAL = await getWAVAXBalance();
}

function filterPaths() {
    paths = orgPaths.filter(path => {
        let { tkns: tknPath, pools: poolsPath } = path
        return !(tknPath[0]!=INPUT_ASSET || tknPath[tknPath.length-1]!=INPUT_ASSET || path.enabled!='1' || MAX_HOPS<poolsPath.length)
    })
}

function getReservePath(path) {
    let reservePath = []
    for (let i=0; i<path.pools.length; i++) {
        let r0 = RESERVES[path.pools[i]][path.tkns[i]]
        let r1 = RESERVES[path.pools[i]][path.tkns[i+1]]
        reservePath.push(r0)
        reservePath.push(r1)
    }
    return reservePath
}


// function getProfitForInputAmount(inputAmount, reservePath) {
//     let amountOut = math.getAmountOutByReserves(inputAmount, reservePath)
//     return amountOut.sub(inputAmount)
// }

// function getOptimalStaticInputAmount(reservePath) {
//     for (let inputAmount of STATIC_INPUT_AMOUNTS) {
//         let profit = getProfitForInputAmount(inputAmount, reservePath)
//         if (profit.gt(0)) {
//             return {inputAmount, profit}
//         }
//     }
//     return {inputAmount: null, profit: null}
// }

// function arbForPath(path) {
//     let reservePath = getReservePath(path)
//     let avlAmount = BOT_BAL.sub(MAX_GAS_COST)

//     let {inputAmount, profit} = getOptimalStaticInputAmount(reservePath)
//     if (!profit || profit.lt('0')) {
//         inputAmount = math.getOptimalAmountForPath(reservePath)
//         inputAmount = avlAmount.gt(inputAmount) ? inputAmount : avlAmount
//         if (inputAmount.lt('0')) {
//             return
//         }
//         profit = getProfitForInputAmount(inputAmount, reservePath)
//     }
//     let gasCost = ethers.utils.parseUnits(GAS_PRICE.mul(path.gasAmount).toString(), 'gwei')
//     let netProfit = profit.sub(gasCost);
//     if (netProfit.gt("0")) {
//         // console.log('_'.repeat(50));
//         // console.log(path.symbol);
//         // console.log('Optimal in:   ', ethers.utils.formatUnits(optimalIn));
//         // console.log('Amount in:    ', ethers.utils.formatUnits(inputAmount));
//         // console.log('Amount out:   ', ethers.utils.formatUnits(amountOut));
//         // console.log('Gross profit: ', ethers.utils.formatUnits(profit));
//         // console.log('Gas cost:     ', ethers.utils.formatUnits(gasCost));
//         // console.log('Net profit:   ', ethers.utils.formatUnits(netProfit));
//         // console.log('^'.repeat(50))
//         return { 
//             profit, 
//             gasCost, 
//             inputAmount, 
//             netProfit, 
//             pathId: path.id,
//             tknPath: path.tkns
//         } 
//     }
// }


function arbForPath(path) {
    let reservePath = getReservePath(path)
    let optimalIn = math.getOptimalAmountForPath(reservePath)
    if (optimalIn.gt("0")) {
        let avlAmount = BOT_BAL.sub(MAX_GAS_COST)
        let inputAmount = avlAmount.gt(optimalIn) ? optimalIn : avlAmount
        let amountOut = math.getAmountOutByReserves(inputAmount, reservePath)
        let profit = amountOut.sub(inputAmount)
        let gasCost = ethers.utils.parseUnits(GAS_PRICE.mul(path.gasAmount).toString(), 'gwei')
        let netProfit = profit.sub(gasCost);
        if (netProfit.gt("0")) {
            // console.log('_'.repeat(50));
            // console.log(path.symbol);
            // console.log('Optimal in:   ', ethers.utils.formatUnits(optimalIn));
            // console.log('Amount in:    ', ethers.utils.formatUnits(inputAmount));
            // console.log('Amount out:   ', ethers.utils.formatUnits(amountOut));
            // console.log('Gross profit: ', ethers.utils.formatUnits(profit));
            // console.log('Gas cost:     ', ethers.utils.formatUnits(gasCost));
            // console.log('Net profit:   ', ethers.utils.formatUnits(netProfit));
            // console.log('^'.repeat(50))
            return { 
                profit, 
                gasCost, 
                inputAmount, 
                netProfit, 
                pathId: path.id,
                tknPath: path.tkns
            } 
        }
    }  
}

/**
 * Returns WAVAX balance for signer, in wei
 */
async function getWAVAXBalance() {
    return await WAVAX_CONTRACT.balanceOf(SIGNER.address)
}

async function submitTradeTx(blockNumber, opp) {
    // let startTime = new Date();
    let tknAddressPath = opp.path.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await ROUTER_CONTRACT.swapExactTokensForTokens(
        opp.inputAmount,
        opp.inputAmount,
        tknAddressPath,
        SIGNER.address,
        Date.now()+180,
        { gasLimit: GAS_LIMIT }
    )
    
    
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash}`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash, BLOCK_WAIT);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Fail: ${txReceipt.transactionHash}`);
        RESERVES = await reservesManager.fetchReservesAll()
        FAILED_TX_IN_A_ROW += 1;
        if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
            console.log("Shutting down... too many failed tx");
            process.exit(0);
        }
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Success: ${txReceipt.transactionHash}`);
        FAILED_TX_IN_A_ROW = 0;
    }
    return txReceipt
} 

/*
* Checks all instructions for arbs associated with the pool
*  
*/
async function arbForPool(blockNumber, poolAddress) {
    if (!RUNWAY_CLEAR) {
        console.log(`${blockNumber} | Tx in flight, ignoring block`);
        return;
    }
    let bestOpp
    // let startTime = new Date();
    // console.log(`debug::findBestOpp::timing 1: ${new Date() - startTime}ms`);

    RESERVES = reservesManager.getAllReserves()
    // console.log(`debug::findBestOpp::timing 2: ${new Date() - startTime}ms`);
    let poolId = pools.filter(p=>p.address==poolAddress)[0].id
    // TODO: filter paths to only do enabled paths!!!
    paths.forEach(path => {
        if (path.pools.includes(poolId)) {
            // console.log('check path ', path.symbol)
            let o = arbForPath(path)
            if (o && ((!bestOpp && o.netProfit.gt(MIN_PROFIT)) || (bestOpp && o.netProfit.gt(bestOpp.netProfit)))) {
                bestOpp = {
                    instrId: o.pathId,
                    inputAmount: o.inputAmount,
                    grossProfit: o.profit, 
                    netProfit: o.netProfit, 
                    path: o.tknPath            
                }
            }
        }
    })
    // let endTime = new Date();
    // let processingTime = endTime - startTime;
    // console.log(`${blockNumber} | Processing time: ${processingTime}ms`)
    // console.log(`debug::findBestOpp::timing 3: ${new Date() - startTime}ms`);
    if (bestOpp) {
        let gasCost = bestOpp.grossProfit.sub(bestOpp.netProfit)
        // send tx
        if (RUNWAY_CLEAR) {
            RUNWAY_CLEAR = false // disable tx (try to avoid fails)
            try {
                await submitTradeTx(blockNumber, bestOpp)
                console.log(`${blockNumber} | ${Date.now()} | 🕵️‍♂️ ARB AVAILABLE | AVAX ${ethers.utils.formatUnits(bestOpp.inputAmount)} -> WAVAX ${ethers.utils.formatUnits(bestOpp.inputAmount.add(bestOpp.netProfit))}`)
                console.log(`Gas cost: ${ethers.utils.formatUnits(gasCost)} | Gross profit: ${ethers.utils.formatUnits(bestOpp.grossProfit)}`)
            }
            catch (error) {
                console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
            }
            RUNWAY_CLEAR = true;
        }
    }
    // Update balance (not time sensitive)
    let avaxBal = await PROVIDER.getBalance(SIGNER.address);
    BOT_BAL = await getWAVAXBalance();
    console.log(`ZERO | ${blockNumber} | AVAX: ${ethers.utils.formatUnits(avaxBal)} | BALANCE: ${ethers.utils.formatUnits(BOT_BAL.add(avaxBal))}`);
}

module.exports = { arbForPool, arbForPath, init, getReservePath, updateReserves: reservesManager.updateReserves }