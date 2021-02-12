const crossDex = require('../crossDex')
const { provider, signer } = require('../provider')
const ethers = require('ethers')



async function findBestOpp() {
    crossDex.initialize(provider)
    let bestOpp = await crossDex.findBestOpp()
    console.log(bestOpp)
}

async function interactWithDispatcher() {
    let abi = require('../config/abis/dispatcher.json')
    let address = "0xd11828308Fc7C84Ea31CCD398E609468d6D20713"
    let contract = new ethers.Contract(address, abi, provider)
    let response = await contract.isTrader('0x103c7BEC38a948b738A430B2b685654dd95bE0A5')
    console.log(response)
}


interactWithDispatcher()

