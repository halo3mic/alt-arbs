const { connectToGancheProvider, WS_AVALANCHE, provider } = require('./avaProvider')
const ethers = require('ethers')


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

getAddressLogs()