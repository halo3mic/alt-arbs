const { provider, signer } = require('./provider').ws
const { UNISWAP_SYNC_TOPIC } = require('./config')
const pools = require('./config/pools.json')
const arbbot = require('./arbbot')


let poolAddresses = []

async function init() {
    let poolAddressMap = Object.fromEntries(pools.map(pool => [pool.id, pool.address]))
    await arbbot.init(provider, signer)  // Initialize with provider and signer
    let paths = arbbot.getPaths()  // Fetch filtered paths
    // Store all pool addresses used in filtered paths
    paths.forEach(path => {
        let pathPoolAddresses = path.pools.map(poolId => poolAddressMap[poolId])
        poolAddresses = [...poolAddresses, ...pathPoolAddresses]
    })
    startListening()
}

/**
 * Listen for logs that match the filter
 */
function startListening() {
    const filter = { topics: [UNISWAP_SYNC_TOPIC] }
    provider.on('block', async(blockNumber) => {
        let startTime = Date.now() // Timestamp when new block is received
        // Fetch all logs for the new block
        let logs = await provider.getLogs(filter)
        let changedPools = logs.map(l => {
            if (poolAddresses.includes(l.address)) {
                arbbot.updateReserves(l.address, l.data)
                return l.address
            }
        }).filter(e=>e)
        if (changedPools.length>0) {
            console.log(`\n${'^'.repeat(20)} ${blockNumber} ${'^'.repeat(20)}\n`)
            console.log(`${blockNumber}| #1 | Processing time: ${Date.now() - startTime}ms`)
            arbbot.handleUpdate(blockNumber, changedPools, startTime)
        }
    })
}


init()