const providers = require('./provider')
const { provider, signer, endpoint } = providers.ws
const { UNISWAP_SYNC_TOPIC } = require('./config')
const pools = require('./config/pools.json')
const arbbot = require('./arbbot')


let poolAddresses = []

async function init() {
    if (process.argv.includes('--fork')) {
        let fProvider = providers.setGancheProvider({'unlocked_accounts': [signer.address]})
        let fSigner = fProvider.getSigner(signer.address)
        fSigner.address = signer.address
        console.log('Started a fork')
        await arbbot.init(fProvider, fSigner)  // Initialize with provider and signer
    } else {
        await arbbot.init(provider, signer)  // Initialize with provider and signer
    }
    let poolAddressMap = Object.fromEntries(pools.map(pool => [pool.id, pool.address]))
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
    console.log('Started listening to:', endpoint)
    const filter = { topics: [UNISWAP_SYNC_TOPIC] }
    provider.on(filter, log => {
        let startTime = Date.now() // Timestamp when new block is received
        console.log(`\n${'^'.repeat(20)} ${log.blockNumber} ${'^'.repeat(20)}\n`)
        if (poolAddresses.includes(log.address)) {
            arbbot.updateReserves(log.address, log.data)
            arbbot.handleUpdate(log, startTime)        
        }
    })
}


init()
