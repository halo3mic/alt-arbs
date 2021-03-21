const { getExchanges } = require('./exchanges')
const { ABIS, DISPATCHER, STATIC_GAS_PRICE, GAS_LIMIT } = require('./config')
const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const ethers = require('ethers')
const config = require('./config')

var SIGNER, PROVIDER, EXCHANGES

function init(provider, signer) {
    EXCHANGES = getExchanges(provider)
    SIGNER = signer
    PROVIDER = provider
}

/**
 * Helper function for submitting bytecode to Archer
 * @param {tx} tx 
 */
function convertTxDataToByteCode(tx) {
    const txData = tx.data
    const dataBytes = ethers.utils.hexDataLength(txData);
    const dataBytesHex = ethers.utils.hexlify(dataBytes);
    const dataBytesPadded = ethers.utils.hexZeroPad(dataBytesHex, 32);

    return ethers.utils.hexConcat([
      tx.to, 
      dataBytesPadded, 
      txData
    ]).split('0x')[1]
}

// TODO What is decimals bigger than 18???
function covertUnitsFrom18(num, dec) {
    // Convert everything to 18 units
    let decDiff = 18 - dec
    let multiplier = ethers.utils.parseUnits('1', decDiff)
    return num.div(multiplier)
}

async function formTradeTx(opp) {
    // Get opportunity as an input
    // Populate tx for specific exchange
    let instr = opp.path
    let pool, tkns, amountIn
    let calldata = ''
    for (let i=0; i<instr.pools.length; i++) {
        pool = pools.filter(p=>p.id==instr.pools[i])[0]
        tkns = instr.tkns.slice(i, i+2).map(tId=>tokens.filter(tObj=>tObj.id==tId)[0])
        tknAddresses = tkns.map(t=>t.address)
        amountIn = opp.swapAmounts[i]
        amountIn = covertUnitsFrom18(amountIn, tkns[0].decimal)
        calldata += await EXCHANGES[pool.exchange].formTradeTx(tknAddresses, amountIn, DISPATCHER).then(r=>convertTxDataToByteCode(r.tradeTx))
    }
    return calldata
}

async function formDispatcherTx(calldata, inputAmount) {
    let dispatcherContract = new ethers.Contract(
        DISPATCHER, 
        ABIS['dispatcher']
    )
    return dispatcherContract.populateTransaction['makeTrade(bytes,uint256)'](
        '0x' + calldata, 
        inputAmount,
        {
            gasLimit: GAS_LIMIT,
        })
}

async function submitTradeTx(blockNumber, txBody) {
    let startTime = new Date();
    let tx = await SIGNER.sendTransaction(txBody)
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash, config.BLOCK_WAIT);
    return txReceipt
} 

async function executeOpportunity(opportunity, blockNumber) {
    let calldata = await formTradeTx(opportunity)
    let tx = await formDispatcherTx(calldata, opportunity.swapAmounts[0])
    // try {
    //     await SIGNER.estimateGas(tx)  // Get more detailed info about tx before sending it
    // } catch(e) {
    //     console.log(e)
    //     console.log('❌ Transaction would fail! Aborting ... ')
    //     return {ok: false, txHash: null, txData: calldata, error: e}
    // }
    return submitTradeTx(blockNumber, tx)
}

module.exports = { init, executeOpportunity, formTradeTx, executeOpportunity }
