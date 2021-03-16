require('dotenv').config()
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')


/**
 * Return all ABIs in abi folder packed in an object
 * @returns {Object}
 */
function loadAllABIs() {
    const abisLocalPath = "./config/abis"
    const absPath = path.resolve(`${__dirname}/${abisLocalPath}`)
    const files = fs.readdirSync(absPath)
    const abis = Object.fromEntries(files.map(fileName => [
        fileName.split('.')[0],
        require(path.join(absPath, fileName))
    ]))
    return abis
}

const EXPLORER_URL = 'https://cchain.explorer.avax.network/tx/'
const ROUTER_ADDRESS = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'
const DEX_NAME = 'CrossDex'
const CHAIN_ASSET_SYMBOL = 'AVAX'

const BASE_ASSET = 'T0000'
const ABIS = loadAllABIs()
// Sync(uint112 reserve0, uint112 reserve1)
const UNISWAP_SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'

const MAX_CONSECUTIVE_FAILS = 20 // After max consecutive fails bot shuts down
const BLOCK_WAIT = 2 // Number of blocks to confirm tx
const MAX_HOPS = 4 // Max number of swaps
const TIMEOUT_OFFSET = 180  // Seconds after which trade expires 

const BOT_ID = 2
const MIN_PROFIT = ethers.utils.parseUnits('0.1')
const STATIC_GAS_PRICE = ethers.BigNumber.from('470')
const GAS_LIMIT = '700000'
const RPC_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc'
const DISPATCHER = '0xd11828308Fc7C84Ea31CCD398E609468d6D20713'
const ROUTERS = {
    ZERO_EXCHANGE: '0x85995d5f8ee9645cA855e92de16FA62D26398060',
    SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    PANGOLIN: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', 
    UNNAMED1: '0xCE679504674F279ac389432c7fe330a48E117148', 
    BAOSWAP: '0x292A6375d6587883bBcabD96860b1834BA14601E', 
    COMPLUS: '0x78c18E6BE20df11f1f41b9635F3A18B8AD82dDD1',
    YETIXYZ: '0x1643D9bb6d154c8729a678526F9Edb55DA44BAB7', 
    YETI: '0x262DcFB36766C88E6A7a2953c16F8defc40c378A', 
}

BLACKLISTED_TKNS = [
    // 'T0019'
]

// Gas settings
const DEFAULT_GAS_PRICE = ethers.utils.parseUnits('470', 'gwei')
const MAX_GAS_COST = ethers.BigNumber.from('1')
const EMPTY_POOL_THRESHOLD = ethers.BigNumber.from('10')

// Provider settings
const PRIVATE_KEY = process.env.PRIVATE_KEY_AVALANCHE
const RPC_ENDPOINT = process.env.RPC_AVALANCHE
const WS_ENDPOINT = process.env.WS_AVALANCHE
const NETWORK = 43114


module.exports = {
    // DYNAMIC_GAS_THRESHOLD,
    MAX_CONSECUTIVE_FAILS,
    // PRCT_PROFIT_FOR_GAS,
    EMPTY_POOL_THRESHOLD,
    CHAIN_ASSET_SYMBOL,
    UNISWAP_SYNC_TOPIC,
    DEFAULT_GAS_PRICE,
    BLACKLISTED_TKNS,
    STATIC_GAS_PRICE,
    RPC_PROVIDER_URL,
    ROUTER_ADDRESS,
    TIMEOUT_OFFSET,
    RPC_ENDPOINT,
    EXPLORER_URL,
    MAX_GAS_COST,
    PRIVATE_KEY, 
    WS_ENDPOINT,
    BASE_ASSET,
    MIN_PROFIT,
    BLOCK_WAIT,
    DISPATCHER,
    GAS_LIMIT,
    MAX_HOPS,
    DEX_NAME,
    NETWORK,
    ROUTERS,
    BOT_ID,
    ABIS,
}
