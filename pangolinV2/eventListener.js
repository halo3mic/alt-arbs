/*
Listens for changes in reserves, updates reserves and notifies arbbot about the change.
*/

const { BigNumber } = require('ethers')
const { provider, signer } = require('./avaProvider')
const arbbot = require('./arbbot')
const pools = require('./config/pools.json')

const uniswapSyncTopic = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'  // Sync(uint112 reserve0, uint112 reserve1)
const poolAddresses = pools.map(p=>p.address)

let reserves = {}
let latestBlock = 0
let changedPools = new Set()

async function init() {
    await arbbot.init(provider, signer)
    startListening()
}

function handleEvent(blockNumber, poolAddress, reserveBytes) {
    arbbot.updateReserves(poolAddress, reserveBytes)
    arbbot.arbForPool(blockNumber, poolAddress)
}

function startListening() {
    const filter = {topics: [uniswapSyncTopic]}
    provider.on(filter, log => {
        if (poolAddresses.includes(log.address)) {
            handleEvent(log.blockNumber, log.address, log.data)
        }
    })
}


init()