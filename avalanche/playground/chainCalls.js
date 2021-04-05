const { connectToGancheProvider, provider, signer } = require('../provider').ws
const ethers = require('ethers')
const config = require('../config')


async function accountBalanceAtBlock(blockNumber, accountAddress) {
    let fork = WS_AVALANCHE + '@' + blockNumber.toString()
    let forkProvider = connectToGancheProvider({fork})
    return forkProvider.getBalance(accountAddress)
}

async function getDispatcherBalance() {
    let forkBlockNumber = 312995
    let accountAddress = '0xd11828308Fc7C84Ea31CCD398E609468d6D20713' // Dispatcher
    let bal = await accountBalanceAtBlock(forkBlockNumber, accountAddress)
    let formattedBal = parseFloat(ethers.utils.formatEther(bal)).toFixed(2)
    console.log(`Balance for account ${accountAddress} at block ${forkBlockNumber}: ${formattedBal}`)
}

async function getAddressLogs() {
    let address = '0x103c7BEC38a948b738A430B2b685654dd95bE0A5'
    let logs = await provider.getLogs({ address: null, topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ]})
    console.log(logs)
}

async function getBlockInfo() {
    let blockNumber = 756731
    let info = await provider.getBlock(blockNumber)
    console.log(info)
}

async function sendFundsBetweenWallets() {
    let destination = '0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab'
    let amount = ethers.utils.parseUnits('1', 'gwei')
    let gasPrice = ethers.utils.parseUnits('225', 'gwei')
    let txObj = await signer.sendTransaction({
        to: destination, 
        value: amount, 
        gasPrice: gasPrice, 
        nonce: 13176
    })
    console.log('sent!')
    console.log(txObj)
    let txReceipt = await provider.waitForTransaction(txObj.hash)
    console.log(txReceipt)
}

async function getNonce() {
    console.log(await signer.getTransactionCount())
}

async function getFactoryFromPool() {
    let poolAddress = '0x494Dd9f783dAF777D3fb4303da4de795953592d0'
    let poolContract = new ethers.Contract(poolAddress, config.ABIS['uniswapPool'], provider)
    let factory = await poolContract.factory()
    console.log(factory)
    
}

getFactoryFromPool()