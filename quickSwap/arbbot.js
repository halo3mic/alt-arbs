const pools = require('./config/pools.json')
const orgPaths = require('./config/paths.json')
const tokens = require('./config/tokens.json')

const reservesManager = require('./reservesManager')
const config = require('./config')
const math = require('./math')

const ethers = require('ethers')


let FAILED_TX_IN_A_ROW = 0
let PATH_FAIL_COUNTER = {}
let POOLS_IN_FLIGHT = []

let WRAPPED_CONTRACT
let ROUTER_CONTRACT
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

    ROUTER_CONTRACT = new ethers.Contract(
        config.ROUTER_ADDRESS,
        config.ABIS['uniswapRouter'],
        signer
    )
    WRAPPED_CONTRACT = new ethers.Contract(
        tokens.filter(t => t.id == config.INPUT_ASSET)[0].address,
        config.ABIS['weth'],
        signer
    )
    filterPaths()
    await reservesManager.init(provider, PATHS) // Initialize reserveres manager
    RESERVES = reservesManager.getAllReserves() // Get reserves for filtered paths
    filterPathsWithEmptyPool()
    BOT_BAL = await getWrappedBalance()
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
 * Return filtered paths
 * Function is meant for external modules to access filtered paths
 */
function getPaths() {
    return PATHS
}

/**
 * Return the token balance of wrapped chain token for signer
 * @returns {ethers.BigNumber}
 */
async function getWrappedBalance() {
    return await WRAPPED_CONTRACT.balanceOf(SIGNER.address)
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
 * Return gas price that best fits conditions and settings
 * If gross profit below threshold return default gas price
 * If gross profit above threshold return dynamic gas price 
 * bounded by min and max limit 
 * @param {ethers.BigNumber} grossProfit - Estimated gross profit from arb
 * @param {String} gasAmount - Amount gas estimated for path
 * @returns {ethers.BigNumber}
 */
function getGasPrice(grossProfit, gasAmount) {
    let gasThreshold = config.DYNAMIC_GAS_THRESHOLD
    let x = config.PRCT_PROFIT_FOR_GAS
    if (grossProfit.gt(gasThreshold.mul(gasAmount))) {
        // Spend x% of gross profit for fees if profit > gasThreshold
        let maxGasCost = ethers.utils.parseEther('1')
        let feesCost = grossProfit.mul(x).div('100')
        let gasPrice = feesCost.div(gasAmount)

        // The gas price should be bounded between 1 eth and default gas price
        gasPrice = gasPrice.gt(gasThreshold) ? gasPrice : gasThreshold
        gasPrice = (gasPrice.mul(config.GAS_LIMIT)).lte(maxGasCost) ? gasPrice : maxGasCost.div(config.GAS_LIMIT)
        return gasPrice
    }
    return config.DEFAULT_GAS_PRICE
}


async function getCompetitiveGasPrice(txHash) {
    const prct= '101'
    let txSelf = await PROVIDER.getTransaction(txHash)
    let blockWithTxs = await PROVIDER.getBlockWithTransactions(txSelf.blockNumber)
    let higherTxs = blockWithTxs.transactions.filter(
        tx=>tx.transactionIndex<txSelf.transactionIndex
    )
    if (higherTxs.length>0) {
        let gasPrices = higherTxs.map(tx=>parseFloat(
            ethers.utils.formatUnits(tx.gasPrice, 'gwei')
        ))
        let maxGasPrice = Math.max(...gasPrices)
        let competitiveGasPrice = ethers.utils.parseUnits(
            maxGasPrice.toString(), 'gwei'
        ).mul(prct).div('100')
        return competitiveGasPrice
    }
}

async function updateGasPrices(txHash) {
    let defaultGasPriceLimit = ethers.utils.parseUnits('200', 'gwei')
    let gasThresholdLimit = ethers.utils.parseUnits('4000', 'gwei')
    let competitiveGasPrice = await getCompetitiveGasPrice(txHash)
    console.log('Competitive gas price: ', competitiveGasPrice)
    if (!competitiveGasPrice) {
        return false
    } else if (competitiveGasPrice.lt(defaultGasPriceLimit)) {
        console.log('Updating default gas price')
        config.DEFAULT_GAS_PRICE = competitiveGasPrice
    } else if (
        competitiveGasPrice.gt(config.DYNAMIC_GAS_THRESHOLD) 
        && competitiveGasPrice.lt(gasThresholdLimit)) {
            console.log('Updating dynamic gas price threshold')
            config.DYNAMIC_GAS_THRESHOLD = competitiveGasPrice
        }
    return true
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
        let gasPrice = getGasPrice(grossProfit, path.gasAmount)
        let gasCost = gasPrice.mul(path.gasAmount)
        let netProfit = grossProfit.sub(gasCost);
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
async function handleUpdate(blockNumber, poolAddresses, startTime) {
    RESERVES = reservesManager.getAllReserves()
    let poolIds = poolAddresses.map(a => {
        let x = pools.filter(p => p.address == a)
        return x.length > 0 ? x[0].id : null
    }).filter(e => e)

    let profitableOpps = []  // Profitable opportunities
    PATHS.forEach(path => {
        // Check if tx is in flight that would affect any of the pools for this path
        let poolsInFlight = path.pools.filter(pathId => POOLS_IN_FLIGHT.includes(pathId)).length > 0
        // Check that path includes the pool that which balance was updated
        let pathIncludesPool = path.pools.filter(p => poolIds.includes(p)).length > 0
        // Check that the path is not blacklisted
        let pathBlacklisted = PATH_FAIL_COUNTER[path.id] > 2
        if (pathIncludesPool && path.enabled && !pathBlacklisted && !poolsInFlight) {
            let opp = arbForPath(path)
            if (opp && opp.netProfit.gt(config.MIN_PROFIT)) {
                if (LAST_FAIL == path.id) {
                    PATH_FAIL_COUNTER[path.id] = (PATH_FAIL_COUNTER[path.id] || 0) + 1
                    return
                }
                opp.blockNumber = blockNumber
                profitableOpps.push(opp)
            }
        }
    })
    if (profitableOpps.length>0) {
        profitableOpps.sort((a, b) => b.netProfit.gt(a.netProfit) ? 1 : -1)
        let parallelOpps = getParallelOpps(profitableOpps)
        parallelOpps.forEach(handleOpportunity)
    }
    updateBotState(blockNumber, startTime)
}

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
    // Check again that any of the pools isnt already in flight
    let poolsInFlight = opp.path.pools.filter(poolId => POOLS_IN_FLIGHT.includes(poolId)).length > 0
    if (poolsInFlight) {
        return false
    }
    try {
        POOLS_IN_FLIGHT = [...POOLS_IN_FLIGHT, ...opp.path.pools]  // Disable pools for the path
        let txReceipt = await submitTradeTx(opp)
        POOLS_IN_FLIGHT = POOLS_IN_FLIGHT.filter(poolId => !opp.path.pools.includes(poolId))  // Reset ignored pools
        
        if (txReceipt.status == 0) {
            await updateGasPrices(txReceipt.transactionHash)
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
        console.log(`${opp.blockNumber} | ${Date.now()} | ❌ Failed to send tx ${error.message}`)
        return false
    }
}

/**
 * Send opportunity on the mainnet and return receipt for the transaction
 * @param {Object} opp - Parameters describing opportunity
 * @returns {Object}
 */
async function submitTradeTx(opp) {
    let tknAddressPath = opp.path.tkns.map(
        t1 => tokens.filter(t2 => t2.id == t1)[0].address
    )
    let tradeTimout = Date.now() + config.TIMEOUT_OFFSET
    let tx = await ROUTER_CONTRACT.swapExactTokensForTokens(
        opp.inputAmount,
        opp.inputAmount,
        tknAddressPath,
        SIGNER.address,
        tradeTimout, 
        {
            gasLimit: config.GAS_LIMIT, 
            gasPrice: opp.gasPrice
        }
    )
    console.log(`${opp.blockNumber} | Tx sent ${tx.nonce}, ${tx.hash}`)
    return PROVIDER.waitForTransaction(tx.hash, config.BLOCK_WAIT);
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
async function updateBotState(blockNumber, startTime) {
    BOT_BAL = await getWrappedBalance();
    let chainTknBal = await PROVIDER.getBalance(SIGNER.address)
    let processingTime = new Date() - startTime
    console.log(`${blockNumber} | Processing time: ${processingTime}ms`)
    console.log('Blacklisted paths: ', PATH_FAIL_COUNTER)
    console.log('Default gas price: ', ethers.utils.formatUnits(config.DEFAULT_GAS_PRICE, 'gwei'))
    console.log('Dynamic gas threshold: ', ethers.utils.formatUnits(config.DYNAMIC_GAS_THRESHOLD, 'gwei'))
    console.log(`${config.DEX_NAME} | ${blockNumber} | \
        ${config.CHAIN_ASSET_SYMBOL}: ${ethers.utils.formatUnits(chainTknBal)} | \
        BALANCE: ${ethers.utils.formatUnits(BOT_BAL.add(chainTknBal))} \
    `)
}

module.exports = {
    updateReserves: reservesManager.updateReserves,
    getReservePath,
    handleUpdate,
    arbForPath,
    getPaths,
    init,
}