const { provider } = require('../provider').ws
const config = require('../config')
const ethers = require('ethers')

async function getFactory() {
    let poolAddress = '0x6c2038f09212dac0ad30be822f0eecfb29064814'
    let poolContract = new ethers.Contract(poolAddress, config.ABIS['uniswapPool'], provider)
    let factoryAddress = await poolContract.factory()
    console.log(factoryAddress)
}

getFactory()