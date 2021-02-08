const fetcher = require('../fetcher')
const { provider, signer } = require('../avaProvider.js')
const tokens = require('../tokens.json')
const pools = require('../pools.json')

fetcher.initialize(provider)

let tknExample1 = {
    id: 'wAVAX', 
    address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 
    decimals: 18
}

let tknExample2 = {
    id: 'zETH', 
    address: '0xf6F3EEa905ac1da6F6DD37d06810C6Fcb0EF5183', 
    decimals: 18
}

let poolExample = {
    id: 'wAVAX-zETH', 
    address: '0x332719570155dc61bEc2901A06d6B36faF02F184',
    tkns: [tknExample1, tknExample2]  // In order they are retrieved!
}

async function demoProvider() {
    console.log(await provider.getBlockNumber())
    console.log(await provider.getBalance('0xc9f2cdb4C3c3d58d30715d796b3396A4617D4441'))
}

async function fetchReservesRaw() {
    let r = await fetcher.fetchReservesRaw(poolExample.address)
    console.log(r)
}

async function fetchReserves() {
    let r = await fetcher.fetchReserves(pools[4])
    console.log(r)
}

async function fetchAllReserves() {
    let r = await fetcher.fetchReservesAll()
    console.log(r)
}


fetchAllReserves()