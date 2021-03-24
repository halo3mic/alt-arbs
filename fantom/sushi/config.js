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

function getPrivateKey() {
    // Specify private key through an argument
    let prefix = '--pk='
    let pkNum = process.argv.filter(a => a.includes(prefix))
    let pkWithAddress = pkNum.length>0 ? process.env[`PK${pkNum[0].replace(prefix, '')}`] : process.env.PK1
    let pk = pkWithAddress.slice(43)
    return pk
}

const EXPLORER_URL = 'https://cchain.explorer.avax.network/address/'
const ROUTER_ADDRESS = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
const FACTORY = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
const DEX_NAME = 'Sushiswap'
const CHAIN_ASSET_SYMBOL = 'FTM'

const INPUT_ASSET = 'T0000'
const ABIS = loadAllABIs()
// Sync(uint112 reserve0, uint112 reserve1)
const UNISWAP_SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'

const MIN_PROFIT = ethers.utils.parseUnits('0.1')
const MAX_CONSECUTIVE_FAILS = 8 // After max consecutive fails bot shuts down
const BLOCK_WAIT = 1 // Number of blocks to confirm tx
const MAX_HOPS = 5 // Max number of swaps
const TIMEOUT_OFFSET = 180  // Seconds after which trade expires 
// Paths with these tokens will be ignored
const BLACKLISTED_TKNS = []
const EMPTY_POOL_THRESHOLD = ethers.BigNumber.from('10')

// Gas settings
// const DYNAMIC_GAS_THRESHOLD = ethers.utils.parseUnits('1260', 'gwei') // Gas price at which dynamic gas starts
const DEFAULT_GAS_PRICE = ethers.utils.parseUnits('22', 'gwei')
const MAX_GAS_COST = ethers.BigNumber.from('1')
// const PRCT_PROFIT_FOR_GAS = '4' // Percentage of gross profit that will be spent on gas
const GAS_LIMIT = "600000"

// Provider settings
const PRIVATE_KEY = getPrivateKey()
const RPC_ENDPOINT = process.env.RPC_FANTOM
const WS_ENDPOINT = process.env.WS_FANTOM
const NETWORK = 250


module.exports = {
    // DYNAMIC_GAS_THRESHOLD,
    MAX_CONSECUTIVE_FAILS,
    // PRCT_PROFIT_FOR_GAS,
    EMPTY_POOL_THRESHOLD,
    CHAIN_ASSET_SYMBOL,
    UNISWAP_SYNC_TOPIC,
    DEFAULT_GAS_PRICE,
    BLACKLISTED_TKNS,
    ROUTER_ADDRESS,
    TIMEOUT_OFFSET,
    RPC_ENDPOINT,
    EXPLORER_URL,
    MAX_GAS_COST,
    PRIVATE_KEY, 
    WS_ENDPOINT,
    INPUT_ASSET,
    MIN_PROFIT,
    BLOCK_WAIT,
    GAS_LIMIT,
    MAX_HOPS,
    DEX_NAME,
    FACTORY,
    NETWORK,
    ABIS,
}