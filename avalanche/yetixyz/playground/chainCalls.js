const { provider } = require('../provider').ws
const config = require('../config')
const ethers = require('ethers')

async function getFactory() {
    let poolAddress = '0x2d2dcb7457B20cD1E3466e4a6a7955b5059A81c7'
    let poolContract = new ethers.Contract(poolAddress, config.ABIS['uniswapPool'], provider)
    let factoryAddress = await poolContract.factory()
    console.log(factoryAddress)
}

getFactory()