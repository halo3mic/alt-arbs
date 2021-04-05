const { setGancheProvider, ws } = require('../provider')
const ethers = require('ethers')
const config = require('../config')


const walletTkns = {
    wavax: {
        address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 
        decimals: 18
    }
}


async function compareToCompetitors() {
    let accounts = [
        '0xd11828308Fc7C84Ea31CCD398E609468d6D20713', 
        '0x8E31F619E73736Fc3B0C070EC0b116404868986a', 
        '0x2119C7525E2446512d64160302fbb9A15d346da4', 
        '0x67c58C8f01f50589A52C2C0b233Db9aF6A66a0F0', 
        '0xF0d2a48eC1F03ce01158A0752aF1e89CdBC95eFA',  // Inludes ABI

    ]
    // let startBlock = 830672  // 29/3/2021
    let startBlock = 955000  
    let endBlock = 971414  // 5/4/2021
    let startBals = await accountBalanceAtBlock(startBlock, accounts)
    let endBals = await accountBalanceAtBlock(endBlock, accounts)
    console.log(startBals)
    console.log(endBals)
}

async function accountBalanceAtBlock(blockNumber, accountAddresses) {
    let fork = ws.endpoint + '@' + blockNumber.toString()
    let forkProvider = setGancheProvider({fork})
    let balances = {}
    for (let account of accountAddresses) {
        const token = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'  // wAVAX
        let avaxBal = await forkProvider.getBalance(account)
        let wavaxBal = await getTknBal(forkProvider, token, account) 
        balances[account] = {
            avax: ethers.utils.formatUnits(avaxBal), 
            wavax: ethers.utils.formatUnits(wavaxBal),
        }
    }
    return balances
}

async function getTknBal(provider, tknAddress, holder) {
    let tknContract = new ethers.Contract(
        tknAddress, 
        config.ABIS['erc20'],
        provider
    )
    return tknContract.balanceOf(holder)
}

compareToCompetitors()