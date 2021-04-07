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
        '0xE14086d1D72b96C11aF2Eb1C8803fecB207fE3e5', 
        '0xF0d2a48eC1F03ce01158A0752aF1e89CdBC95eFA',  // Inludes ABI
        // '0x244d39947d270b9Ce739DbeFFEd1A00585B9F635',
        '0x00000093696106bf5fdE58a46c5ABa257B2cDCe1',

    ]
    // let startBlock = 830672  // 29/3/2021
    // let endBlock = 947911
    let startBlock = 907911  // 2/4/2021
    let endBlock = 951414  // 5/4/2021
    let startBals = await accountBalanceAtBlock(startBlock, accounts)
    let endBals = await accountBalanceAtBlock(endBlock, accounts)
    console.log(startBals)
    console.log(endBals)
    let profits = await getAccountBalDiff(accounts, startBlock, endBlock)
    console.log(profits)
}

async function getAccountBalDiff(accounts, startBlock, endBlock) {
    let startBals = await accountBalanceAtBlock(startBlock, accounts)
    let endBals = await accountBalanceAtBlock(endBlock, accounts)
    let profits = {}
    for (let account of accounts) {
        let accTotStartBal = 0
        profits[account] = {}
        for (let tkn of [...Object.keys(walletTkns), 'avax']) {
            let startBal = parseFloat(startBals[account][tkn])
            let endBal = parseFloat(endBals[account][tkn])
            profits[account][tkn] = endBal - startBal
            accTotStartBal += startBal
        }
        if (accTotStartBal==0) {
            delete profits[account]
        }
    }
    return profits
}

async function accountBalanceAtBlock(blockNumber, accountAddresses) {
    let fork = ws.endpoint + '@' + blockNumber.toString()
    let forkProvider = setGancheProvider({fork})
    let balances = {}
    for (let account of accountAddresses) {
        let avaxBal = await forkProvider.getBalance(account)
        balances[account] = {
            avax: ethers.utils.formatUnits(avaxBal), 
        }
        for (let tknKey of Object.keys(walletTkns)) {
            balances[account][tknKey] = await getTknBal(
                forkProvider, 
                walletTkns[tknKey].address, 
                account
            ).then(bal => ethers.utils.formatUnits(
                bal,
                walletTkns[tknKey].decimals
            ))
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