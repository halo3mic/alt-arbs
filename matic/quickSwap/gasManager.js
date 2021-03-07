const config = require('./config')
const ethers = require('ethers')

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
    let defaultGasPriceLimit = ethers.utils.parseUnits('300', 'gwei')
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

module.exports = {
    updateGasPrices,
    getGasPrice, 
}