const { instructions, pools, tokens } = require('./arb/instrManager')
const { MAX_INPUT_ETH, OPP_LOGS_PATH, BOT_ID } = require('./config')
const { logToCsv } = require('./utils')
const { evaluate, calcProfit } = require('./arb/evaluator')
const { getExchanges } = require('./arb/exchanges')
const { BigNumber, Contract, utils } = require('ethers')

var exchanges

function initialize(provider) {
    exchanges = getExchanges(provider)
}

async function findOpportunity(instr, reservesAll) {
    const pool1Res = reservesAll[instr.pools[0]]
    const pool2Res = reservesAll[instr.pools[1]]
    const params = [
        pool1Res[instr.tkns[0]].from.balance,
        pool1Res[instr.tkns[1]].to.balance,
        pool2Res[instr.tkns[0]].from.balance,
        pool2Res[instr.tkns[1]].to.balance,
        pools[instr.pools[0]].fee,
        pools[instr.pools[1]].fee,
        pool1Res[instr.tkns[0]].from.weight,
        pool1Res[instr.tkns[1]].from.weight,
        pool2Res[instr.tkns[0]].from.weight,
        pool2Res[instr.tkns[1]].from.weight,
    ]
    const evaluation = evaluate(...params)
    // Dont process the evaluation results if arb not there
    if (!evaluation.arbAvailable)
        return evaluation
    
    var results = {}
    maxInputEth = await MAX_INPUT_ETH
    results.arbAvailable = evaluation.arbAvailable
    results.optimalInputAmount = utils.parseEther(evaluation.optimalAmount.toFixed(18)) // Note!!! change 18 with base decimals
    results.optimalProfit = utils.parseEther(evaluation.profit.toFixed(18))
    const inputAmount = evaluation.optimalAmount < maxInputEth ? evaluation.optimalAmount : maxInputEth
    const profit = evaluation.optimalAmount < maxInputEth ? evaluation.profit : calcProfit(inputAmount, ...Object.values(params))
    results.profit = utils.parseEther(profit.toFixed(18))
    results.inputAmount = utils.parseEther(inputAmount.toFixed(18))

    return results
}

async function fetchAllReserves() {
    var uniResInstr = {}
    
    function addPoolInstr(pool, tkns) {
        if (!Object.keys(uniResInstr).includes(pool)) {
            uniResInstr[pool] = {}
            uniResInstr[pool][tkns[0]] = {'from': true}
            uniResInstr[pool][tkns[1]] = {'to': true}
        }
        uniResInstr[pool][tkns[0]]['from'] = true
        uniResInstr[pool][tkns[1]]['to'] = true
    }
    // First prepare data so that no reserve will overlap or be left out
    Object.values(instructions).forEach(instr => {
        const [ poolId1, poolId2 ] = instr.pools
        addPoolInstr(poolId1, instr.tkns.slice(0, 2))
        addPoolInstr(poolId2, instr.tkns.slice(1, 3))
    })
    // console.log(uniResInstr)
}

async function handleNewBlock(blockNumber) {
    const reserves = await Promise.all(Object.values(pools).map(async pool => {
        return [
            pool.id, 
            await exchanges[pool.exchange].fetchReserves(pool)
        ]
    }))
    var opportunities = await Promise.all(Object.values(instructions).map(async instr => {
        const reservesObj = Object.fromEntries(reserves)
        const eval = await findOpportunity(instr, reservesObj)
        if (!eval.arbAvailable)
            return
        // TODO: Add and log gas prices and net profit
        const opportunity = {
            blockNumber,
            instrId: instr.id,
            instrSymbol: instr.symbol, 
            grossProfit: eval.profit, 
            optimalProfit: eval.optimalProfit, 
            inputAmount: eval.inputAmount, 
            optimalAmount: eval.optimalInputAmount, 
            gasAmount: instr.gasAmount, 
            gasAmountArcher: instr.gasAmountArcher, 
        }
        return opportunity
    }))
    opportunities = opportunities.filter(e => e)
    if (opportunities.length==0) {
        console.log("No opps detected")
        return
    } else {
        // Find best opportunity and send it to archer
        const bestOpp = opportunities.sort((a,b)=>b.grossProfit-a.grossProfit)[0]
        console.log(bestOpp)
        await sendToArcher(bestOpp)
        // Log opportunities
        logToCsv(opportunities, OPP_LOGS_PATH)  // Logs all opportunities to CSV file
    }
}

module.exports = { 
    handleNewBlock, 
    sendToArcher, 
    findOpportunity, 
    initialize, 
    fetchAllReserves
}

