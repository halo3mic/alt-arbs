const ethers = require('ethers')
const { provider } = require('../provider')
const txMng = require('../txManager')


async function formTradeTx() {
    txMng.initialize(provider)
    const opportunity = {
        blockNumber: ethers.constants.One,
        instrId: 'I0000',
        grossProfit: ethers.BigNumber.from('2000'), 
        optimalProfit: ethers.BigNumber.from('2300'), 
        inputAmount: ethers.BigNumber.from('0x439a73685520a45025'), 
        optimalAmount: ethers.BigNumber.from('0x439a73685520a45025'),
        gasAmount: ethers.BigNumber.from('300000'),
        pathAmounts: [
            ethers.BigNumber.from('0x439a73685520a45025'),
            ethers.BigNumber.from('0xc3f5c4b0171be0'),
            ethers.BigNumber.from('0x8df82fbecec1d68145'),
        ]
    }
    let response = await txMng.formTradeTx(opportunity)
    // console.log(response)
}

formTradeTx()