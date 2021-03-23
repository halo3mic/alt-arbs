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

/**
 * Set paths that fit configuration
 * Paths are filtered for tkns; path length; start and end asset and that path is enabled
 */
function filterPaths() {
    PATHS = orgPaths.filter(path => {
        return (
            path.tkns.filter(t => config.BLACKLISTED_TKNS.includes(t)).length == 0 &&
            path.tkns[0] == config.INPUT_ASSET &&
            path.tkns[path.tkns.length - 1] == config.INPUT_ASSET &&
            path.enabled=='1' &&
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
 * Return filtered paths
 * Function is meant for external modules to access filtered paths
 */
function getPaths() {
    return PATHS
}

async function getBalance() {
    return PROVIDER.getBalance(SIGNER.address).catch(e => 
        {
            console.log('Failed to catch balance of the signer')
            console.log(e)
        })
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
        let amountOut = math.getAmountOutByReserves(inputAmount, reservePath)
        let grossProfit = amountOut.sub(inputAmount)
        let gasPrice = config.DEFAULT_GAS_PRICE
        // let gasCost = gasPrice.mul(path.gasAmount)

        let gasCost = ethers.constants.Zero
        let netProfit = grossProfit.sub(gasCost)

        if (netProfit.gt("0")) {
            return {
                inputAmount,
                grossProfit,
                netProfit,
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
        // let pathIncludesPool = path.pools.filter(p => poolIds.includes(p)).length > 0
        let pathIncludesPool = true
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
        let txReceipt = await txMng.executeOpportunity(opp, opp.blockNumber)
        POOLS_IN_FLIGHT = POOLS_IN_FLIGHT.filter(poolId => !opp.path.pools.includes(poolId))  // Reset ignored pools
        
        if (txReceipt.status == 0) {
            FAILED_TX_IN_A_ROW += 1
            LAST_FAIL = opp.pathId
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

/**
 * Log opportunity details and tx status to console
 * @param {Object} opp - Parameters describing opportunity
 * @param {Object} txReceipt - Transaction receipt
 */
function printOpportunityInfo(opp, txReceipt) {
    let gasCostFormatted = ethers.utils.formatUnits(opp.gasPrice.mul(opp.path.gasAmount))
    let inputAmountFormatted = ethers.utils.formatUnits(opp.inputAmount)
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
    BOT_BAL = await getBalance()
    // let chainTknBal = await PROVIDER.getBalance(SIGNER.address)
    console.log('Blacklisted paths: ', PATH_FAIL_COUNTER)
    console.log(`${config.DEX_NAME} | ${blockNumber} | \
        ${config.CHAIN_ASSET_SYMBOL}: ${ethers.utils.formatUnits(BOT_BAL)} | \
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