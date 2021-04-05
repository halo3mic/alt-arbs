const { getExchanges } = require('./exchanges')
const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const ethers = require('ethers')
const config = require('./config')

var SIGNER, PROVIDER, EXCHANGES, NONCE

async function init(provider, signer) {
    NONCE = (await signer.getTransactionCount()) -1
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

function covertUnitsFrom18(num, dec) {
    // TODO: More elegant solution to this
    // Convert everything to 18 units
    let decDiff = 18 - dec
    let multiplier = ethers.utils.parseUnits('1', decDiff)
    return num.div(multiplier)
}

async function formDispatcherTxWithQuery(inputAmount, queryTx, tradeTx, txArgs) {
    let dispatcherContract = new ethers.Contract(
        config.DISPATCHER, 
        config.ABIS['dispatcher'], 
    )
    NONCE ++  // Increment it so no tx can use the same nonce while waiting for execution of the populateTransaction call below
    return dispatcherContract.populateTransaction['makeTrade(bytes,uint256[],bytes,uint256[],uint256,uint256)'](
        queryTx.calldata, 
        queryTx.inputLocs,
        tradeTx.calldata,
        tradeTx.inputLocs,
        inputAmount,  // Target price
        inputAmount, 
        {
            gasPrice: txArgs.gasPrice, 
            gasLimit: txArgs.gasLimit, 
            nonce: NONCE
        }
    )
}

async function formTradeTx(opp) {
    let path = opp.path
    let pool, tkns, amountIn
    let calldata = ''
    let inputLocs = []
    for (let i=0; i<path.pools.length; i++) {
        pool = pools.filter(p=>p.id==path.pools[i])[0]
        tkns = path.tkns.slice(i, i+2).map(tId=>tokens.filter(tObj=>tObj.id==tId)[0])
        tknAddresses = tkns.map(t=>t.address)
        if (i==0) {
            amountIn = opp.swapAmounts[i]
            amountIn = covertUnitsFrom18(amountIn, tkns[0].decimal)
        } else {
            amountIn = ethers.constants.Zero  // Pass in zero to replace this amount with query result during execution
        }
        let tradeTx = await EXCHANGES[pool.exchange].formTradeTx(amountIn, tknAddresses)
        let _inputLoc = tradeTx.inputLocs.map(loc => loc+calldata.length/2)  // Relative loc + Previous bytes
        inputLocs = [...inputLocs, ..._inputLoc]
        calldata += convertTxDataToByteCode(tradeTx.tx)
    }
    calldata = '0x' + calldata
    return { calldata, inputLocs }
}

async function formQueryTx(opp) {
    let path = opp.path
    let pool, tkns, amountIn
    let calldata = ''
    let inputLocs = []
    for (let i=0; i<path.pools.length; i++) {
        pool = pools.filter(p=>p.id==path.pools[i])[0]
        tkns = path.tkns.slice(i, i+2).map(tId=>tokens.filter(tObj=>tObj.id==tId)[0])
        tknAddresses = tkns.map(t=>t.address)
        if (i==0) {
            amountIn = opp.swapAmounts[i]
            amountIn = covertUnitsFrom18(amountIn, tkns[0].decimal)
        } else {
            amountIn = ethers.constants.Zero  // Pass in zero to replace this amount with query result during execution
        }
        let tradeTx = await EXCHANGES[pool.exchange].formQueryTx(amountIn, tknAddresses)
        let _inputLoc = tradeTx.inputLocs.map(loc => loc+calldata.length/2)  // Relative loc + Previous bytes
        inputLocs = [...inputLocs, ..._inputLoc]
        calldata += convertTxDataToByteCode(tradeTx.tx)
    }
    calldata = '0x' + calldata
    return { calldata, inputLocs }
}

async function submitTradeTx(blockNumber, txBody) {
    let startTime = new Date()
    let tx = await SIGNER.sendTransaction(txBody)
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash, config.BLOCK_WAIT)

    return txReceipt
} 

async function executeOpportunity(opportunity) {
    let tradeTx = await formTradeTx(opportunity).catch(e => {
        console.log('Failed to form makeTrade tx')
        console.log(e)   
    })
    let queryTx = await formQueryTx(opportunity).catch(e => {
        console.log('Failed to form query call')
        console.log(e)   
    })
    let txArgs = {
        gasPrice: opportunity.gasPrice, 
        gasLimit: config.GAS_LIMIT, 
    }
    let tx = await formDispatcherTxWithQuery(
        opportunity.swapAmounts[0], 
        queryTx,
        tradeTx, 
        txArgs,
    ).catch(e => {
        console.log('Failed to form dispatcher tx')
        console.log(e)
    })
    // If debug flag is passed check if tx would fail
    if (process.argv.includes('--simulate')) {
        try {
            await SIGNER.estimateGas(tx)  // Get more detailed info about tx before sending it
            console.log('✅ Transaction would pass!')
            return {status: true, txHash: null}
        } catch(e) {
            console.log(e)
            console.log('❌ Transaction would fail! Aborting ... ')
            return {status: false, txHash: null, error: e}
        }
    }
    let timeoutPromise = new Promise(function(resolve, reject) {
        setTimeout(() => reject(new Error('Tx submission timeout reached')), config.SUBMISSION_TIMEOUT);
    })
    return Promise.race([
        submitTradeTx(opportunity.blockNumber, tx),
        timeoutPromise
    ])
}


module.exports = {
    executeOpportunity,
    formTradeTx, 
    init, 
}
