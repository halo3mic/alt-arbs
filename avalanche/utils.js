const { ethers } = require('ethers')
const resolve = require('path').resolve
const fs = require('fs');
const csvWriter = require('csv-write-stream')

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


function logToCsv(path, data) {
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

function saveReserves(reservesNew, path, blockNumber) {
    try {
        let absScrtsPath = resolve(`${__dirname}/${path}`)
        let currentSaves = JSON.parse(fs.readFileSync(absScrtsPath, 'utf8'))
        currentSaves[blockNumber] = reservesNew
        fs.writeFileSync(absScrtsPath, JSON.stringify(currentSaves, null, 4))
        return true
    } catch(e) {
        console.log('Couldnt save!')
        console.log(e)
        return 
    }
}

module.exports = { convertTxDataToByteCode, logToCsv }