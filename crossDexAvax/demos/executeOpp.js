const ethers = require('ethers')
const { provider, signer } = require('../provider')
const txMng = require('../txManager')


async function formTradeTx() {
    txMng.initialize(provider, signer)
    const opportunity = {
        blockNumber: ethers.constants.One,
        instrId: 'I0003',
        grossProfit: ethers.BigNumber.from('0x327de4e50e0241e5'), 
        pathAmounts: [
            ethers.BigNumber.from('0x2e4e62af5db0044e'),
            ethers.BigNumber.from('0xc22d352a7379cf'),
            ethers.BigNumber.from('0x8d59e93eea9c7549f9'),
            ethers.BigNumber.from('0x60cc47946bb24633'),
        ]
    }
    let response = await txMng.formTradeTx(opportunity)
    console.log(response)
}

async function executeOpportunity() {
    txMng.initialize(provider, signer)
    const opportunity = {
        blockNumber: ethers.constants.One,
        instrId: 'I0003',
        grossProfit: ethers.BigNumber.from('0x327de4e50e0241e5'), 
        pathAmounts: [
            ethers.BigNumber.from('0x2e4e62af5db0044e'),
            ethers.BigNumber.from('0xc22d352a7379cf'),
            ethers.BigNumber.from('0x8d59e93eea9c7549f9'),
            ethers.BigNumber.from('0x60cc47946bb24633'),
        ]
    }
    let response = await txMng.executeOpportunity(opportunity)
    console.log(response)
}

executeOpportunity()