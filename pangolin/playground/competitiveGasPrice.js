const { provider } = require('../provider').ws
const ethers = require('ethers')


async function getCompetitiveGasPrice(txHash) {
    const prct= '101'
    let txSelf = await provider.getTransaction(txHash)
    let blockWithTxs = await provider.getBlockWithTransactions(txSelf.blockNumber)
    let higherTxs = blockWithTxs.transactions.filter(tx=>tx.transactionIndex<txSelf.transactionIndex)
    
    if (higherTxs.length>0) {
        let gasPrices = higherTxs.map(tx=>parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')))
        let maxGasPrice = Math.max(...gasPrices)
        let competitiveGasPrice = ethers.utils.parseUnits(maxGasPrice.toString(), 'gwei').mul(prct).div('100')
        return competitiveGasPrice
    }
}


async function main() {
    let txHash = '0xdbb44a1e22f19ef0271d22fffbc9a83f56e7a76c302d09a2c4663df22f1d93ff'
    let gasPrice = await getCompetitiveGasPrice(txHash)
    console.log(ethers.utils.formatUnits(gasPrice, 'gwei'))
}

main()