const fetcher = require('../fetcher')
const { provider, signer } = require('../provider')
const paths = require('./dummyData/paths.json')
const ethers = require('ethers')



async function interactWithPool() {
    console.log(await provider.getBlockNumber())
    let abi = require('../config/abis/uniswapPool.json')
    let address = "0x332719570155dc61bEc2901A06d6B36faF02F184"
    let contract = new ethers.Contract(address, abi, provider)
    let response = await contract.getReserves()
    console.log(response)
}

async function fetchReservesAll() {
    fetcher.initialize(provider)
    let r = await fetcher.fetchReservesAll()
    console.log(r)
}

fetchReservesAll()