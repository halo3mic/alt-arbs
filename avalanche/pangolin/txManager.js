const { getExchanges } = require('./exchanges')
const { ABIS, DISPATCHER } = require('./config')
const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const paths = require('./config/paths.json')
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

async function unWrapEth(amount) {
    let address = tokens.filter(tkn=>tkn.id==config.INPUT_ASSET)[0].address
    let wethContract = new ethers.Contract(address, config.ABIS['weth'])
    let tx = await wethContract.populateTransaction.withdraw(amount)
    return {
        tx, 
        inputLocs: []
    }
}

async function formTradeTx(opp) {
    // Populate tx for specific exchange
    let instr = opp.path
    let pool = pools.filter(p=>p.id==instr.pools[0])[0]
    let tkns = instr.tkns.map(tId=>tokens.filter(tObj=>tObj.id==tId)[0].address)
    // populate tx with getTokensFromExactEth
    let tradeTx = await EXCHANGES[pool.exchange].formTradeTx(
        tkns, 
        opp.inputAmount,
        config.DISPATCHER
    ).catch(e => {
        console.log('Failed to form swap transaction!')
        console.log(e)
    })
    tradeTx['calldata'] = convertTxDataToByteCode(tradeTx.tx)
    // Unwrap received tokens
    let amountOut = opp.inputAmount.add(opp.grossProfit)
    let unwrapTx = await unWrapEth(amountOut
        ).catch(e => {
            console.log('Failed to form unwrap transaction!')
            console.log(e)
        })
    unwrapTx['calldata'] = convertTxDataToByteCode(unwrapTx.tx)
    let calldata = '0x' + tradeTx.calldata + unwrapTx.calldata
    let inputLocs = [...tradeTx.inputLocs, ...unwrapTx.inputLocs]
    return { calldata, inputLocs }
}

async function formQueryTx(opp) {
    let pool = pools.filter(p=>p.id==opp.path.pools[0])[0]
    let tkns = opp.path.tkns.map(tId=>tokens.filter(tObj=>tObj.id==tId)[0].address)
    let {tx, inputLocs} = await EXCHANGES[pool.exchange].formQueryTx(
        opp.inputAmount, 
        tkns
    ).catch(e => {
        console.log('Failed to form swap transaction!')
        console.log(e)
    })
    let calldata= '0x' + convertTxDataToByteCode(tx)
    return { calldata, inputLocs }
}

async function formDispatcherTx(inputAmount, tradeTx) {
    let dispatcherContract = new ethers.Contract(
        config.DISPATCHER, 
        config.ABIS['dispatcher'], 
    )
    return dispatcherContract.populateTransaction['makeTrade(bytes,uint256)'](
        tradeTx.calldata, 
        inputAmount
    )
}

async function formDispatcherTxWithQuery(inputAmount, queryTx, tradeTx) {
    let dispatcherContract = new ethers.Contract(
        config.DISPATCHER, 
        config.ABIS['dispatcher'], 
    )
    return dispatcherContract.populateTransaction['makeTrade(bytes,uint256[],bytes,uint256[],uint256,uint256)'](
        queryTx.calldata, 
        queryTx.inputLocs,
        tradeTx.calldata,
        tradeTx.inputLocs,
        inputAmount,  // Target price
        inputAmount
    )
}

async function submitTradeTx(blockNumber, txBody) {
    let startTime = new Date()
    let tx = await SIGNER.sendTransaction(txBody)
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash, config.BLOCK_WAIT);

    return txReceipt
} 

async function executeOpportunity(opportunity, blockNumber) {
    console.log(opportunity)
    let tradeTx = await formTradeTx(opportunity).catch(e => {
        console.log('Failed to form makeTrade tx')
        console.log(e)   
    })
    let queryTx = await formQueryTx(opportunity).catch(e => {
        console.log('Failed to form query call')
        console.log(e)   
    })
    let tx = await formDispatcherTxWithQuery(
        opportunity.inputAmount, 
        queryTx,
        tradeTx, 
    ).catch(e => {
        console.log('Failed to form dispatcher tx')
        console.log(e)
    })
    try {
        await SIGNER.estimateGas(tx)  // Get more detailed info about tx before sending it
    } catch(e) {
        console.log(e)
        console.log('❌ Transaction would fail! Aborting ... ')
        return {ok: false, txHash: null, txData: calldata, error: e}
    }
    return submitTradeTx(blockNumber, tx)
}

module.exports = { 
    formDispatcherTxWithQuery,
    executeOpportunity, 
    executeOpportunity,
    formDispatcherTx,
    formTradeTx, 
    init, 
}
