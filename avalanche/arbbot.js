const pools = require('./config/pools.json')
const orgPaths = require('./config/paths.json')

const reservesManager = require('./reservesManager')
const txMng = require('./txManager')
const config = require('./config')
const utils = require('./utils')
const math = require('./math')

const ethers = require('ethers')
const crypto = require('crypto')


let FAILED_TX_IN_A_ROW = 0
let PATH_FAIL_COUNTER = {}
let POOLS_IN_FLIGHT = []
let PROVIDER
let RESERVES 
let BOT_BAL
let SIGNER
let PATHS

const NODE_IP = config.WS_ENDPOINT.match('\(?<=\/\/)(.*?)(?=\:)')[0]

/**
 * Intialize state
 * @param {ethers.providers.JsonRpcProvider} provider
 * @param {ethers.providers.JsonRpcSigner} signer
 */
 async function init(provider, signer) {
    SIGNER = signer
    PROVIDER = provider
    filterPaths()
    await txMng.init(provider, signer)
    await reservesManager.init(provider, PATHS) // Initialize reserveres manager
    RESERVES = reservesManager.getAllReserves() // Get reserves for filtered paths
    filterPathsWithEmptyPool()
    estimateGasForPaths()
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
    // Flag --cross-only will enable only paths that include cross dex trade
    // Flag --internal-only will enable only internal paths
    let poolDexMap = Object.fromEntries(pools.map(pool => [pool.id, pool.exchange]))
    PATHS = orgPaths.filter(path => {
        let exchangePath = path.pools.map(poolId=>poolDexMap[poolId])
        return (
            path.tkns.filter(t => config.BLACKLISTED_TKNS.includes(t)).length == 0 &&  // Exclude blacklisted tokens
            path.tkns[0] == config.BASE_ASSET &&  // Paths needs to start in BASE-ASSET
            path.tkns[path.tkns.length - 1] == config.BASE_ASSET &&  // Path needs to end in BASE-ASSET
            path.enabled &&  
            config.MAX_HOPS >= path.pools.length - 1 &&  // Filter path length
            exchangePath.filter(dex=>!config.ENABLED_DEXS.includes(dex)).length == 0 &&  // Filter dexs
            (((new Set(exchangePath)).size==1) || !process.argv.includes('--internal-only')) &&  // If internal-only flag is passed filter out cross-dex
            (((new Set(exchangePath)).size>1) || !process.argv.includes('--cross-only'))  // If cross-only flag is passed filter out internal paths
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

function estimateGasForPaths() {
    PATHS = PATHS.map(path => {
        path.gasAmount = estimateGasAmount(path.pools.length)
        return path
    })
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

function optimalAmountStatic(reservePath) {
    let options = [
        ethers.utils.parseEther('10'),
        ethers.utils.parseEther('30'),
        ethers.utils.parseEther('100'),
        ethers.utils.parseEther('500'),
    ]
    let bestIn = ethers.constants.Zero
    let bestProfit = ethers.constants.Zero
    for (let option of options) {
        let amountOut = math.getAmountOutByReserves(option, reservePath)
        let profit = amountOut.sub(option)
        if (profit.gt(bestProfit)) {
            bestProfit = profit
            bestIn = option
        } else {
            break
        }
    }
    return bestIn
}

/**
 * Return opportunity if net profitable
 * @param {Object} path - Estimated gross profit from arb
 * @returns {Object}
 */
 function arbForPath(path) {
    let reservePath = getReservePath(path)
    // Check if there is an arb before calculating optimal amount
    let smallInAmount = ethers.utils.parseUnits('1')
    let amountOut = math.getAmountOutByReserves(smallInAmount, reservePath)
    if (amountOut.lte(smallInAmount)) {
        return
    }
    let optimalIn = config.STATIC_IN ? optimalAmountStatic(reservePath) : math.getOptimalAmountForPath(reservePath)
    if (optimalIn.gt("0")) {
        let avlAmount = BOT_BAL.sub(config.MAX_GAS_COST) // How much bot can spend on trade
        let inputAmount = avlAmount.gt(optimalIn) ? optimalIn : avlAmount
        let swapAmounts = math.getAmountsByReserves(inputAmount, reservePath)
        let grossProfit = swapAmounts[swapAmounts.length-1].sub(inputAmount)
        let gasPrice = config.DEFAULT_GAS_PRICE
        let gasCost = process.argv.includes('--zero-gas') ? ethers.constants.Zero : gasPrice.mul(path.gasAmount)
        let netProfit = grossProfit.sub(gasCost);
        // console.log(`Net profit: ${ethers.utils.formatUnits(netProfit)} ETH`)
        // console.log(`Gas cost: ${ethers.utils.formatUnits(gasPrice)} ETH`)
        // console.log(`Gas amount: ${path.gasAmount}`)
        if (netProfit.gt(config.MIN_PROFIT)) {
            // gasPrice = gasPrice.add(getExtraGas(netProfit))  // Gas price + netProfit indentifier
            return {
                gasAmount: path.gasAmount,
                swapAmounts,
                grossProfit,
                netProfit,
                gasPrice,
                gasCost,
                path,
            }
        }
    }
}

function generateOppId(opp) {
    return opp.blockNumber.toString() + opp.path.id
}

function generateUpdateId(blockNumber, poolAddresses) {
    let poolString = poolAddresses.join('')
    let poolHash = crypto.createHash('md5').update(poolString).digest('hex')
    return blockNumber.toString() + 'P' + poolHash
}

/**
 * Find and handle best arb opportunity for changed balance of pools
 * @param {number} blockNumber
 * @param {Array} poolAddresses - Pools with updated balances
 * @param {number} startTimestamp - Timestamp[ms] when block was received
 * @returns {Object}
 */
 async function arbForPools(blockNumber, poolAddresses, startTimestamp) {
    let updateId = generateUpdateId(blockNumber, poolAddresses)
    RESERVES = reservesManager.getAllReserves()
    let poolIds = poolAddresses.map(a => {
        let x = pools.filter(p => p.address == a)
        return x.length > 0 ? x[0].id : null
    }).filter(e => e)
    let profitableOpps = []
    let pathsSearched = 0
    PATHS.forEach(path => {
        // Check if tx is in flight that would affect any of the pools for this path
        let poolsInFlight = path.pools.filter(poolId => POOLS_IN_FLIGHT.includes(poolId)).length > 0
        // Check that path includes the pool that which balance was updated
        let pathIncludesPool = path.pools.filter(p => poolIds.includes(p)).length > 0
        if (pathIncludesPool && !poolsInFlight) {
            pathsSearched ++
            let opp = arbForPath(path)
            if (opp) {
                // POOLS_IN_FLIGHT = [...POOLS_IN_FLIGHT, ...opp.path.pools]  // Disable pools for the path
                opp.blockNumber = blockNumber
                opp.id = generateOppId(opp)
                profitableOpps.push(opp)
                if (config.QUICK_FIRE) {
                    POOLS_IN_FLIGHT = [...POOLS_IN_FLIGHT, ...opp.path.pools]  // Disable pools for the path
                    handleOpportunity(opp)
                } else {
                    profitableOpps.push(opp)
                }
            }
        }
    })
    let finishedProcessingTimestamp = Date.now()
    if (profitableOpps.length>0) {
        profitableOpps.sort((a, b) => b.netProfit.gt(a.netProfit) ? 1 : -1)
        let parallelOpps = getParallelOpps(profitableOpps)
        // await handleOpportunity(parallelOpps[0])
        let executedOpps = await Promise.all(parallelOpps.map(async opp => {
            opp.execution = await handleOpportunity(opp)
            return opp
        }))
        // Log opporunity and its execution
        executedOpps.forEach(opp => {
            printOpportunityInfo(opp)
            let txHash = opp.execution.error ? null : opp.execution.txReceipt.transactionHash
            let executionTime = opp.execution.sentTimestamp ? opp.execution.sentTimestamp-finishedProcessingTimestamp : null
            let errorMsg = opp.execution.error ? opp.execution.error.message : null
            utils.logToCsv('./avalanche/logs/opps.csv', {
                oppId: opp.id,
                updateId,
                findingBlock: opp.blockNumber,
                pathId: opp.path.id, 
                amountIn: opp.swapAmounts[0], 
                predictedNetProfit: opp.netProfit, 
                predictedGrossProfit: opp.grossProfit,
                predictedGas: opp.gasAmount,
                txHash, 
                internalError: errorMsg, 
                executionTime
            })
        })
    }
    // Log update 
    utils.logToCsv('./avalanche/logs/update.csv', {
        updateId,
        blockNumber, 
        traderAddress: SIGNER.address, 
        nodeIp: NODE_IP,
        startTimestamp: startTimestamp.toString(), 
        processingTime: finishedProcessingTimestamp - startTimestamp, 
        updatedPools: poolAddresses.join('-'), 
        searchedPaths: pathsSearched
    })
    console.log(`${blockNumber} | Processing time: ${finishedProcessingTimestamp - startTimestamp}ms`)
    console.log(`${blockNumber} | Pools in flight: ${POOLS_IN_FLIGHT.join(', ')}`)
    updateBotState(blockNumber)
}

/**
 * Return an array of opportunities which pools won't overlap
 * @param {Object} opp - Parameters describing opportunity
 * @returns {Array}
 */
 function getParallelOpps(opps) {
    let parallelOpps = []
    let poolsUsed = []
    opps.forEach(opp => {
        let pathIncludesUsedPool = opp.path.pools.filter(poolId => {
            return poolsUsed.includes(poolId)
        }).length > 0
        if (!pathIncludesUsedPool) {
            poolsUsed = [...poolsUsed, ...opp.path.pools]
            parallelOpps.push(opp)
        }
    })
    return parallelOpps
}

/**
 * Handle an arbitrage opportunity
 * @param {Object} opp - Parameters describing opportunity
 */
async function handleOpportunity(opp) {
    try {
        POOLS_IN_FLIGHT = [...POOLS_IN_FLIGHT, ...opp.path.pools]  // Disable pools for the path
        let txReceipt = await txMng.executeOpportunity(opp)
        var sentTimestamp = Date.now()
        // console.log(opp.blockNumber, ' | Reseting pools in flight: ', POOLS_IN_FLIGHT)
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
        return { txReceipt, sentTimestamp }
    } catch (error) {
        POOLS_IN_FLIGHT = POOLS_IN_FLIGHT.filter(poolId => !opp.path.pools.includes(poolId))  // Reset ignored pools
        console.log(`${opp.blockNumber} | ${Date.now()} | Failed to send tx ${error.message}`)
        return { error, sentTimestamp }
    }
}

/**
 * Log opportunity details and tx status to console
 * @param {Object} opp - Parameters describing opportunity
 * @param {Object} txReceipt - Transaction receipt
 */
 function printOpportunityInfo(opp) {
    let gasCostFormatted = ethers.utils.formatUnits(opp.gasPrice.mul(opp.path.gasAmount))
    let inputAmountFormatted = ethers.utils.formatUnits(opp.swapAmounts[0])
    let grossProfitFormatted = ethers.utils.formatUnits(opp.grossProfit)
    let netProfitFormatted = ethers.utils.formatUnits(opp.netProfit)
    let status
    if (opp.execution.error) {
        status = `${opp.blockNumber} | ${Date.now()} | ❌ Intenal Fail: ${opp.execution.error}`
    } else {
        let txLink = config.EXPLORER_URL + opp.execution.txReceipt.transactionHash
        let failMsg = `${opp.blockNumber} | ${Date.now()} | ❌ Tx Fail: ${txLink}`
        let passMsg = `${opp.blockNumber} | ${Date.now()} | ✅ Tx Success: ${txLink}`
        status = opp.execution.txReceipt.status==1 ? passMsg : failMsg
    }

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
