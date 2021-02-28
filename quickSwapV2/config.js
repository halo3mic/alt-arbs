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

const EXPLORER_URL = 'https://explorer-mainnet.maticvigil.com/tx/'
const ROUTER_ADDRESS = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
const DEX_NAME = 'QuickSwap'
const CHAIN_ASSET_SYMBOL = 'MATIC'

const INPUT_ASSET = 'T0000'
const ABIS = loadAllABIs()
// Sync(uint112 reserve0, uint112 reserve1)
const UNISWAP_SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'


const DEFAULT_GAS_PRICE = ethers.utils.parseUnits('2.11', 'gwei')
const MIN_PROFIT = ethers.utils.parseUnits('0.1')
const MAX_GAS_COST = ethers.BigNumber.from('1')
const MAX_CONSECUTIVE_FAILS = 8 // After max consecutive fails bot shuts down
const BLOCK_WAIT = 1 // Number of blocks to confirm tx
const MAX_HOPS = 5 // Max number of swaps
const TIMEOUT_OFFSET = 180  // Seconds after which trade expires 
// Paths with these tokens will be ignored
const BLACKLISTED_TKNS = [
    'T0044', // db
    'T0058', // mrbal
    'T0030', // $dg
]

// Gas settings
const DYNAMIC_GAS_THRESHOLD = ethers.utils.parseUnits('1114.1', 'gwei') // Gas price at which dynamic gas starts
const PRCT_PROFIT_FOR_GAS = '1' // Percentage of gross profit that will be spent on gas
const GAS_LIMIT = "600000"

// Provider settings
const PRIVATE_KEY = process.env.PRIVATE_KEY_MATIC
const RPC_ENDPOINT = process.env.RPC_MATIC
const WS_ENDPOINT = process.env.WS_MATIC
const NETWORK = 137


module.exports = {
    DYNAMIC_GAS_THRESHOLD,
    MAX_CONSECUTIVE_FAILS,
    PRCT_PROFIT_FOR_GAS,
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
    NETWORK,
    ABIS,
}