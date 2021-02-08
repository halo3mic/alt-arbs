const { ethers } = require('ethers')
const { ARCHER_API_KEY } = require('./secrets')
const { ARCHER_URL, ARCHER_FAILS_PATH, ARCHER_PASSES_PATH } = require('./config')
const fs = require('fs');
const csvWriter = require('csv-write-stream')
const fetch = require('node-fetch')

/**
 * Returns local time as a BigNumber
 */
function getCurrentTime() {
    return ethers.BigNumber.from(Math.floor(Date.now() / 1000).toString());
}

/**
 * Returns the breakeven gas price for an opportunity.
 * @param {BigNumber} reward in terms of ETH
 * @param {BigNumber | String} gasEstimate 
 */
function getBreakEvenGasPrice(reward, gasEstimate) {
    let breakEvenGasPrice = reward.div(gasEstimate);
    return breakEvenGasPrice;
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

async function handleArcherResponse(response) {
    console.log("handleArcherResponse::status", response.status);
    let json = await response.json();
    if (response.status == 200) {
        console.log("handleArcherResponse::ok", json);
        logToCsv(json, ARCHER_PASSES_PATH)
    }
    else if (response.status == 406) {
        console.log("handleArcherResponse::err", json);
        logToCsv(json, ARCHER_FAILS_PATH)
        if (json.reason == "opportunity too late") {
            return;
        }
        else if (json.reason == "opportunity too early") {
            // TODO - wait and resubmit
        }
    }
    else {
        console.log("handleArcherResponse::err", json);
    }
}


async function broadcastToArcherWithOpts(
    botId, query, trade, targetBlock, gasLimit, 
    estimatedProfitBeforeGas, 
    queryBreakEven = ethers.BigNumber.from("0"),
    inputAmount = ethers.BigNumber.from("0"),
    inputAsset = "ETH",
    queryInsertLocations = [],
    tradeInsertLocations = [],
    blockDeadline = null, 
    deadline = null
) {
    console.log(
        "broadcastToArcher::targetBlock", targetBlock, 
        gasLimit.toString(), 
        ethers.utils.formatUnits(estimatedProfitBeforeGas)
    );

    const bodyObject = {
      bot_id: botId, // ID of bot
      target_block: targetBlock.toString(), // Target block where you'd like the trade to take place
      trade, // bytecode for trade
      estimated_profit_before_gas: estimatedProfitBeforeGas.toString(), // expected profit in wei before accounting for gas
      gas_estimate: gasLimit.toString(), // Expected gas usage of trade
    //   query, // OPTIONAL: query bytecode to run before trade
      query_breakeven: queryBreakEven.toString(), // OPTIONAL: query return value minimum to continue with trade
      input_amount: inputAmount.toString(), // OPTIONAL: value to withdraw from dispatcher liquidity
      input_asset: inputAsset, // OPTIONAL: asset to withdraw from dispatcher liquidity
    //   query_insert_locations: queryInsertLocations, // OPTIONAL: locations in query to insert values
    //   trade_insert_locations: tradeInsertLocations, // OPTIONAL: location in trade to insert values
      deadline_block_number: blockDeadline.toString()
    };

    if (deadline) {
        bodyObject['min_timestamp'] = deadline.toString(),
        bodyObject['max_timestamp'] = deadline.add("180").toString()
    }

    const body = JSON.stringify(bodyObject);
    let options = {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'x-api-key': ARCHER_API_KEY
        },
        body,
    }
    fetch(ARCHER_URL, options)
        .then(response => handleArcherResponse(response))
        .catch(error => console.log("broadcastToArcher::error", error));
}

function logToCsv(data, path) {
    if (!Array.isArray(data)) {
        data = [data]
    }
    let writer = csvWriter()
    let headers = {sendHeaders: false}
    if (!fs.existsSync(path))
        headers = {headers: Object.keys(data[0])}
    writer = csvWriter(headers);
    writer.pipe(fs.createWriteStream(path, {flags: 'a'}));
    data.forEach(e => writer.write(e))
    writer.end()
}

module.exports = { broadcastToArcherWithOpts, convertTxDataToByteCode, logToCsv }