// const { convertTxDataToByteCode } = require('../utils')
const { getExchanges } = require('./exchanges')
const { ABIS } = require('./config')
const paths = require('./config/paths.json')
const pools = require('./config/pools.json')
const tokens = require('./config/tokens.json')
const ethers = require('ethers')
// const { tokens } = require('./instrManager')

var ROUTER_CONTRACT, WAVAX_CONTRACT, SIGNER, PROVIDER, EXCHANGES

function initialize(provider, signer) {
    EXCHANGES = getExchanges(provider)
    // SIGNER = signer
    // PROVIDER = provider
    // ROUTER_CONTRACT = new ethers.Contract(
    //     ABIS['uniswapRouter'],
    //     uniswapRouterAbi,
    //     signer
    // )
    // WAVAX_CONTRACT = new ethers.Contract(
    //     tokens.filter(t=>t.id=='T0000')[0].address,
    //     ABIS['wethRouter'],
    //     signer
    //     )
}

/**
 * Returns WAVAX balance for signer, in wei
 */
async function getWAVAXBalance() {
    return await WAVAX_CONTRACT.balanceOf(SIGNER.address)
}

async function unwrapAvax(amount, blockNumber) {
    let tx = await WAVAX_CONTRACT.withdraw(amount);
    console.log(`${blockNumber} | ${Date.now()} | Unwrap sent ${tx.nonce}, ${tx.hash}`)
    let txReceipt = await PROVIDER.waitForTransaction(tx.hash);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Unwrap fail: ${txReceipt.transactionHash}`);
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Unwrap success: ${txReceipt.transactionHash}`);
    }
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
        amountIn = i==0 ? opp.inputAmount : await EXCHANGES[pool.exchange].getAmountOut(opp.inputAmount, tkns)
        console.log(tkns)
        console.log(amountIn.toString())
        calldata += await EXCHANGES[pool.exchange].formTradeTx(tkns, amountIn).then(r=>convertTxDataToByteCode(r.tradeTx))
    }
    return calldata
}


async function submitTradeTx(blockNumber, opp) {
    let startTime = new Date();
    let tknAddressPath = opp.path.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await ROUTER_CONTRACT.swapExactAVAXForTokens(
        opp.inputAmount,
        tknAddressPath,
        SIGNER.address,
        Date.now()+180,
        {
            gasLimit: GAS_LIMIT,
            value: opp.inputAmount
        }
    )
    console.log(`${blockNumber} | Tx sent ${tx.nonce}, ${tx.hash} | Processing time (debug): ${new Date() - startTime}ms`)

    let txReceipt = await PROVIDER.waitForTransaction(tx.hash);
    if (txReceipt.status == 0) {
        console.log(`${blockNumber} | ${Date.now()} | ❌ Fail: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        FAILED_TX_IN_A_ROW += 1;
        if (FAILED_TX_IN_A_ROW > MAX_CONSECUTIVE_FAILS) {
            console.log("Shutting down... too many failed tx");
            process.exit(0);
        }
    }
    else if (txReceipt.status == 1) {
        console.log(`${blockNumber} | ${Date.now()} | ✅ Success: ${txReceipt.transactionHash} | Processing time (debug): ${new Date() - startTime}ms`);
        FAILED_TX_IN_A_ROW = 0;
    }
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

module.exports = { formTradeTx, initialize }