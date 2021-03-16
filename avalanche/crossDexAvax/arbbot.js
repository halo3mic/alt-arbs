const pools = require('./config/pools.json')
const orgPaths = require('./config/paths.json')
const tokens = require('./config/tokens.json')

const reservesManager = require('./reservesManager')
const txMng = require('./txManager')
const config = require('./config')
const math = require('./math')

const ethers = require('ethers')


let FAILED_TX_IN_A_ROW = 0
let PATH_FAIL_COUNTER = {}
let POOLS_IN_FLIGHT = []

let LAST_FAIL  // Path id of the last fail
let PROVIDER
let RESERVES 
let BOT_BAL
let SIGNER
let PATHS


/**
 * Intialize state
 * @param {ethers.providers.JsonRpcProvider} provider
 * @param {ethers.providers.JsonRpcSigner} signer
 */
 async function init(provider, signer) {
    SIGNER = signer
    PROVIDER = provider
    filterPaths()
    txMng.init(provider, signer)
    await reservesManager.init(provider, PATHS) // Initialize reserveres manager
    RESERVES = reservesManager.getAllReserves() // Get reserves for filtered paths
    filterPathsWithEmptyPool()
    BOT_BAL = await getBalance()
}

async function getBalance() {
    return PROVIDER.getBalance(config.DISPATCHER)
}

/**
 * Set paths that fit configuration
 * Paths are filtered for tkns; path length; start and end asset and that path is enabled
 */
 function filterPaths() {
    PATHS = orgPaths.filter(path => {
        return (
            path.tkns.filter(t => config.BLACKLISTED_TKNS.includes(t)).length == 0 &&
            path.tkns[0] == config.BASE_ASSET &&
            path.tkns[path.tkns.length - 1] == config.BASE_ASSET &&
            path.enabled &&
            config.MAX_HOPS >= path.pools.length - 1
        )
    })
    console.log('Found ', PATHS.length, ' valid paths')
}

/**
 * Filter out all paths that have an empty pool
 */
 function filterPathsWithEmptyPool() {
    let threshold = config.EMPTY_POOL_THRESHOLD
    let emptyPools = Object.entries(RESERVES).map(e => {
        let [ poolId, reserves ] = e
        let rVals = Object.values(reserves) 
        if (rVals[0].lt(threshold) || rVals[1].lt(threshold)) {
            return poolId
        }
    }).filter(e=>e)
    PATHS = PATHS.filter(path=>path.pools.filter(p=>emptyPools.includes(p)).length==0)
    console.log('Found ', PATHS.length, ' valid paths with non-empty pools')
}


/**
 * Estimate gas cost for an internal Uniswap trade with nSteps.
 * @dev Gas estimate for wrapping 32k
 * @dev Actual gasPerStep varies. Estimated 62k
 * @dev Avalanche has static gas price (may change in hardfork). Set to 470gwei
 * @param {BigNumber} nSteps 
 * @returns {BigNumber} gas cost in wei
 */
function estimateGasAmount(nSteps) {
    let gasToUnwrap = ethers.BigNumber.from("32000")
    let gasPerStep = ethers.BigNumber.from("120000")
    let totalGas = gasToUnwrap.add(gasPerStep.mul(nSteps))
    return totalGas
}

/**
 * Return filtered paths
 * Function is meant for external modules to access filtered paths
 */
 function getPaths() {
    return PATHS
}

/**
 * Return array of reserves in order in which path will go through them
 * @param {Object} path
 * @returns {Array}
 */
 function getReservePath(path) {
    let reservePath = []
    for (let i = 0; i < path.pools.length; i++) {
        let r0 = RESERVES[path.pools[i]][path.tkns[i]]
        let r1 = RESERVES[path.pools[i]][path.tkns[i + 1]]
        reservePath.push(r0)
        reservePath.push(r1)
    }
    return reservePath
}


/**
 * Return opportunity if net profitable
 * @param {Object} path - Estimated gross profit from arb
 * @returns {Object}
 */
 function arbForPath(path) {
    let reservePath = getReservePath(path)
    let optimalIn = math.getOptimalAmountForPath(reservePath)
    if (optimalIn.gt("0")) {
        let avlAmount = BOT_BAL.sub(config.MAX_GAS_COST) // How much bot can spend on trade
        let inputAmount = avlAmount.gt(optimalIn) ? optimalIn : avlAmount
        let swapAmounts = math.getAmountsByReserves(inputAmount, reservePath)
        let grossProfit = swapAmounts[swapAmounts.length-1].sub(inputAmount)
        let gasPrice = config.DEFAULT_GAS_PRICE
        let gasAmount = estimateGasAmount(path.pools.length)
        let gasCost = gasPrice.mul(gasAmount)
        let netProfit = grossProfit.sub(gasCost);
        if (netProfit.gt(config.MIN_PROFIT)) {
            return {
                swapAmounts,
                grossProfit,
                netProfit,
                gasAmount,
                gasPrice,
                gasCost,
                path,
            }
        }
    }
}

/**
 * Find and handle best arb opportunity for changed balance of pools
 * @param {number} blockNumber
 * @param {Array} poolAddresses - Pools with updated balances
 * @param {number} startTime - Timestamp[ms] when block was received
 * @returns {Object}
 */
 async function arbForPools(blockNumber, poolAddresses, startTime) {
    RESERVES = reservesManager.getAllReserves()
    let poolIds = poolAddresses.map(a => {
        let x = pools.filter(p => p.address == a)
        return x.length > 0 ? x[0].id : null
    }).filter(e => e)

    let bestOpp
    PATHS.forEach(path => {
        // Check if tx is in flight that would affect any of the pools for this path
        let poolsInFlight = path.pools.filter(pathId => POOLS_IN_FLIGHT.includes(pathId)).length > 0
        // Check that path includes the pool that which balance was updated
        let pathIncludesPool = path.pools.filter(p => poolIds.includes(p)).length > 0
        // Check that the path is not blacklisted
        let pathBlacklisted = PATH_FAIL_COUNTER[path.id] > 2
        if (pathIncludesPool && path.enabled && !pathBlacklisted && !poolsInFlight) {
            let opp = arbForPath(path)
            let cond1 = opp && !bestOpp && opp.netProfit.gt(config.MIN_PROFIT)
            let cond2 = opp && bestOpp && opp.netProfit.gt(bestOpp.netProfit)
            if (cond1 || cond2) {
                if (LAST_FAIL == path.id) {
                    PATH_FAIL_COUNTER[path.id] = (PATH_FAIL_COUNTER[path.id] || 0) + 1
                    return
                }
                opp.blockNumber = blockNumber
                bestOpp = opp
            }
        }
    })
    let endTime = new Date();
    let processingTime = endTime - startTime;
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)
    if (bestOpp) {
        await handleOpportunity(bestOpp)
    }
    updateBotState(blockNumber)
}

/**
 * Handle an arbitrage opportunity
 * @param {Object} opp - Parameters describing opportunity
 */
async function handleOpportunity(opp) {
    // Check again that any of the pools isnt already in flight
    let poolsInFlight = opp.path.pools.filter(poolId => POOLS_IN_FLIGHT.includes(poolId)).length > 0
    if (poolsInFlight) {
        return false
    }
    try {
        POOLS_IN_FLIGHT = [...POOLS_IN_FLIGHT, ...opp.path.pools]  // Disable pools for the path
        let txReceipt = await txMng.executeOpportunity(opp)
        POOLS_IN_FLIGHT = POOLS_IN_FLIGHT.filter(poolId => !opp.path.pools.includes(poolId))  // Reset ignored pools
        
        if (txReceipt.status == 0) {
            FAILED_TX_IN_A_ROW += 1
            LAST_FAIL = opp.path.id
            // Include fail-safe to prevent bot blow-up
            if (FAILED_TX_IN_A_ROW > config.MAX_CONSECUTIVE_FAILS) {
                console.log("Shutting down... too many failed tx")
                process.exit(0)
            }
        } else if (txReceipt.status == 1) {
            FAILED_TX_IN_A_ROW = 0
            LAST_FAIL = null
        }
        printOpportunityInfo(opp, txReceipt)
        return true
    } catch (error) {
        console.log(`${opp.blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
        return false
    }
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
            opportunity = {
                hostname: HOST_NAME,
                wallet: SIGNER.address,
                botBalance: config.BOT_BAL, 
                blockNumber: blockNumber, 
                timestamp: Date.now(), 
                instrId: bestOpp.instrId, 
                pathAmounts: bestOpp.pathAmounts.join('\n'),
                grossProfit: bestOpp.grossProfit, 
                netProfit: bestOpp.netProfit
            }
            try {
                
                opportunity.txData = txData
                opportunity.txHash = txHash
                opportunity.error = error
                if (ok) {
                    FAILED_TX_IN_A_ROW = 0;
                } else if (txHash && !ok) {
                    FAILED_TX_IN_A_ROW += 1;
                    if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
                        console.log("Shutting down... too many failed tx");
                        process.exit(0);
                }
        }
            }
            catch (error) {
                console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
            } finally {
                // logToCsv(opportunity, SAVE_PATH)
            }
            RUNWAY_CLEAR = true;
        }
    }
    // else {
    //     // There is no arb, do you want to unwrap avax?
    //     let wavaxBalance = await getWAVAXBalance();
    //     if (wavaxBalance.gt(ethers.utils.parseUnits(WAVAX_MAX_BAL))) {
    //         RUNWAY_CLEAR = false // disable tx (try to avoid fails)
    //         console.log(`${blockNumber} | ${Date.now()} | 🛫 Sending transaction... Unwrapping ${ethers.utils.formatUnits(wavaxBalance)} WAVAX`);
    //         try {
    //             let ok = await unwrapAvax(wavaxBalance, blockNumber);
    //             if (ok) {
    //                 FAILED_TX_IN_A_ROW = 0;
    //             } else {
    //                 FAILED_TX_IN_A_ROW += 1;
    //                 if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
    //                     console.log("Shutting down... too many failed tx");
    //                     process.exit(0);
    //                 }
    //             }
    //         }
    //         catch (error) {
    //             console.log(`${blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
    //         }
    //         RUNWAY_CLEAR = true;
    //     }
    // }

    let endTime = new Date();
    let processingTime = endTime - startTime;
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)
    

    // Update balance (not time sensitive)
    // let balance = await PROVIDER.getBalance(SIGNER.address);
    // let wavaxBalance = await getWAVAXBalance();
    // console.log(`${blockNumber} | AVAX: ${ethers.utils.formatUnits(balance)} | WAVAX: ${ethers.utils.formatUnits(wavaxBalance)}`);
}


/**
 * Log opportunity details and tx status to console
 * @param {Object} opp - Parameters describing opportunity
 * @param {Object} txReceipt - Transaction receipt
 */
 function printOpportunityInfo(opp, txReceipt) {
    let gasCostFormatted = ethers.utils.formatUnits(opp.gasPrice.mul(opp.path.gasAmount))
    let inputAmountFormatted = ethers.utils.formatUnits(opp.swapAmounts[0])
    let grossProfitFormatted = ethers.utils.formatUnits(opp.grossProfit)
    let netProfitFormatted = ethers.utils.formatUnits(opp.netProfit)

    let txLink = config.EXPLORER_URL + txReceipt.transactionHash
    let failMsg = `${opp.blockNumber} | ${Date.now()} | ❌ Fail: ${txLink}`
    let passMsg = `${opp.blockNumber} | ${Date.now()} | ✅ Success: ${txLink}`
    let status = txReceipt.status==1 ? passMsg : failMsg

    console.log('_'.repeat(50))
    console.log(`${opp.blockNumber} | ${Date.now()} | 🕵️‍♂️ ARB AVAILABLE`)
    console.log('Path: ', opp.path.symbol)
    console.log(`Input amount: ${inputAmountFormatted}`)
    console.log(`Gross profit: ${grossProfitFormatted}`)
    console.log(`Net profit: ${netProfitFormatted}`)
    console.log(`Gas cost: ${gasCostFormatted}`)
    console.log('Result:\n', status)
    console.log('^'.repeat(50))
}

/**
 * Update state of the bot and display it
 * This includes wrapped and total ablance and blacklisted paths
 */
async function updateBotState(blockNumber) {
    BOT_BAL = await getBalance();
    let traderBal = await PROVIDER.getBalance(SIGNER.address)
    console.log('Blacklisted paths: ', PATH_FAIL_COUNTER)
    console.log(`${config.DEX_NAME} | ${blockNumber} | \
        BOT BAL: ${ethers.utils.formatUnits(BOT_BAL)} AVAX | \
        TRADER+BOT BAL: ${ethers.utils.formatUnits(BOT_BAL.add(traderBal))} AVAX \
    `)
}

module.exports = {
    updateReserves: reservesManager.updateReserves,
    getReservePath,
    arbForPools,
    arbForPath,
    getPaths,
    init,
}
