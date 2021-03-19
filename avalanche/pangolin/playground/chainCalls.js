const providers = require('../provider')
const ethers = require('ethers')
const config = require('../config')


async function accountBalanceAtBlock(blockNumber, accountAddress) {
    let fork = providers.ws.endpoint + '@' + blockNumber.toString()
    let forkProvider = providers.setGanacheProvider({fork})
    let avaxBal = await forkProvider.getBalance(accountAddress)
    let wavaxAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
    let wavaxContract = new ethers.Contract(wavaxAddress, config.ABIS['erc20'], forkProvider)
    let wavaxBal = await wavaxContract.balanceOf(accountAddress)
    let bals = { wavaxBal, avaxBal }

    return bals
}

async function getWrappedBalance() {
   return await WRAPPED_CONTRACT.balanceOf(SIGNER.address)
}

async function getBalance1() {
    let forkBlockNumber = 657582
    let accountAddress = '0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab'
    let {wavaxBal, avaxBal} = await accountBalanceAtBlock(forkBlockNumber, accountAddress)
    let formattedBalAvax = parseFloat(ethers.utils.formatEther(avaxBal)).toFixed(2)
    let formattedBalWavax = parseFloat(ethers.utils.formatEther(wavaxBal)).toFixed(2)
    console.log(`Balance for account ${accountAddress} at block ${forkBlockNumber}: \n${formattedBalAvax} AVAX & ${formattedBalWavax} WAVAX`)
}

async function getAddressLogs() {
    let address = '0x103c7BEC38a948b738A430B2b685654dd95bE0A5'
    let logs = await provider.getLogs({ address: null, topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ]})
    console.log(logs)
}

getBalance1()
