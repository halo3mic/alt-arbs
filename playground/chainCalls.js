const { connectToGancheProvider, WS_AVALANCHE } = require('./avaProvider')
const ethers = require('ethers')


async function accountBalanceAtBlock(blockNumber, accountAddress) {
    let fork = WS_AVALANCHE + '@' + blockNumber.toString()
    let forkProvider = connectToGancheProvider({fork})
    return forkProvider.getBalance(accountAddress)
}

async function main() {
    let forkBlockNumber = 312995
    let accountAddress = '0xd11828308Fc7C84Ea31CCD398E609468d6D20713' // Dispatcher
    let bal = await accountBalanceAtBlock(forkBlockNumber, accountAddress)
    let formattedBal = parseFloat(ethers.utils.formatEther(bal)).toFixed(2)
    console.log(`Balance for account ${accountAddress} at block ${forkBlockNumber}: ${formattedBal}`)
}

main()