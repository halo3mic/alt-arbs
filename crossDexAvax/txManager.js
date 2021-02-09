const { getExchanges } = require('./exchanges')
const { ABIS } = require('./config')
const paths = require('./config/paths.json')
const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const ethers = require('ethers')

var SIGNER, PROVIDER, EXCHANGES

function initialize(provider, signer) {
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

async function formTradeTx(opp) {
    // Get opportunity as an input
    // Populate tx for specific exchange
    let instr = paths.filter(p=>p.id==opp.instrId)[0]
    let pool, tkns, amountIn
    let calldata = ''
    for (let i=0; i<instr.pools.length; i++) {
        pool = pools.filter(p=>p.id==instr.pools[i])[0]
        tkns = instr.tkns.slice(i, i+2).map(tId=>tokens.filter(tObj=>tObj.id==tId)[0].address)
        amountIn = opp.pathAmounts[0]
        calldata += await EXCHANGES[pool.exchange].formTradeTx(tkns, amountIn, config.DISPATCHER).then(r=>convertTxDataToByteCode(r.tradeTx))
    }
    return calldata
}

async function formDispatcherTx() {
    let params = [
        tradeTxFull, 
        inputAmount,
    ]
    let dispatcherContract = new ethers.Contract(
        config.DISPATCHER, 
        ABIS['dispatcher']
    )
    return dispatcherContract.populateTransaction.makeTrade(params)
}

async function submitTradeTx(blockNumber, txBody) {
    let startTime = new Date();
    let tx = await SIGNER.sendTransaction(txBody)
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)
    process.exit()
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Fail: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        return false
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Success: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        return true
        
    }
} 

async function executeOpportunity(opportunity) {
    let calldata = await formTradeTx(opportunity)
    let tx = await formDispatcherTx(calldata, opportunity.inputAmount)
    submitTradeTx(opportunity.blockNumber, tx)
}

module.exports = { initialize, executeOpportunity }