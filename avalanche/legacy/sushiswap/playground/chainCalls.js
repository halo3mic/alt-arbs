const { provider } = require('../provider').ws
const config = require('../config')
const ethers = require('ethers')

async function getFactory() {
    let poolAddress = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
    let poolContract = new ethers.Contract(poolAddress, config.ABIS['uniswapPool'], provider)
    let factoryAddress = await poolContract.factory()
    console.log(factoryAddress)
}

getFactory()