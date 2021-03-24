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
    let prefix = '--pk'
    let pkNum = process.argv.filter(a => a.includes(prefix))
    let pkWithAddress = pkNum.length>0 ? process.env[`PK${pkNum[0].replace(prefix, '')}`] : process.env.PK1
    let pk = pkWithAddress.slice(43)
    return pk
}

function getEnabledDexs() {
    // Pass the dex key with --dex=<key>
    // eg. --dex=pangolin,zero,yeti
    // All dexs are enabled by default
    let userInput = process.argv.filter(arg=>arg.includes('--dex'))
    if (userInput.length>0) {
        userInput = userInput[0].replace('--dex=', '').split(',')
        let allowed = DEX_KEYS.filter(d=>userInput.includes(d))
        return allowed
    }
    return DEX_KEYS

}

const DEX_KEYS = [
    'zeroExchange', 
    'sushiswap',
    'yetiswap', 
    'pangolin', 
    'unnamed1',
    'yetiXYZ', 
    'complus', 
    'baoSwap', 
    'elk',
]
const ENABLED_DEXS = getEnabledDexs()

const EXPLORER_URL = 'https://cchain.explorer.avax.network/tx/'
const ROUTER_ADDRESS = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'
const DEX_NAME = ENABLED_DEXS.map(d=>d.toUpperCase()).join(' & ')
const CHAIN_ASSET_SYMBOL = 'AVAX'

const BASE_ASSET = 'T0000'
const ABIS = loadAllABIs()
// Sync(uint112 reserve0, uint112 reserve1)
const UNISWAP_SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'

const MAX_CONSECUTIVE_FAILS = 10 // After max consecutive fails bot shuts down
const BLOCK_WAIT = 2 // Number of blocks to confirm tx
const MAX_HOPS = 3 // Max number of swaps
const TIMEOUT_OFFSET = 180  // Seconds after which trade expires 

const BOT_ID = 2
const MIN_PROFIT = ethers.utils.parseUnits('0.05')
const STATIC_GAS_PRICE = ethers.BigNumber.from('470')
const GAS_LIMIT = '700000'
const DISPATCHER = '0xd11828308Fc7C84Ea31CCD398E609468d6D20713'
const ROUTERS = {
    ZERO_EXCHANGE: '0x85995d5f8ee9645cA855e92de16FA62D26398060',
    UNISH_PROXY: '0xF9eCB1b756Da68F60acBc33A436F631A7155bB96',
    SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    PANGOLIN: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', 
    UNNAMED1: '0xCE679504674F279ac389432c7fe330a48E117148', 
    BAOSWAP: '0x292A6375d6587883bBcabD96860b1834BA14601E', 
    COMPLUS: '0x78c18E6BE20df11f1f41b9635F3A18B8AD82dDD1',
    YETIXYZ: '0x1643D9bb6d154c8729a678526F9Edb55DA44BAB7', 
    YETI: '0x262DcFB36766C88E6A7a2953c16F8defc40c378A', 
    ELK: '0x091d35d7F63487909C863001ddCA481c6De47091',
}

const FACTORIES = {
    ELK: '0x091d35d7F63487909C863001ddCA481c6De47091',
    PANGOLIN: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
    ZERO_EXCHANGE: '0x091d35d7F63487909C863001ddCA481c6De47091',
    COMPLUS: '0x5C02e78A3969D0E64aa2CFA765ACc1d671914aC0', 
    BAOSWAP: '0x29D1Adbb65d93a5710cafe2EF0E8131f64E6AB22', 
    YETI: '0x58C8CD291Fa36130119E6dEb9E520fbb6AcA1c3a', 
    SUSHISWAP: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4', 
    YETIXYZ: '0xf2aBD8FaFb2f1AfE2465f243Ef2093CD0e3cBABF',
    UNNAMED1: '0xeb4E120069d7AaaeC91508eF7EAec8452893a80a',
}

const BLACKLISTED_TKNS = [
    'T0020',  // SFI
    'T0019',  // YTS
    'T0043',  // SPORE
]

// Gas settings
const DEFAULT_GAS_PRICE = ethers.utils.parseUnits('470', 'gwei')
const MAX_GAS_COST = ethers.BigNumber.from('1')
const EMPTY_POOL_THRESHOLD = ethers.BigNumber.from('10')

// Provider settings
const PRIVATE_KEY = getPrivateKey()
const RPC_ENDPOINT = process.env.RPC_AVALANCHE
const WS_ENDPOINT = process.env.WS_AVALANCHE
const NETWORK = 43114



module.exports = {
    MAX_CONSECUTIVE_FAILS,
    EMPTY_POOL_THRESHOLD,
    CHAIN_ASSET_SYMBOL,
    UNISWAP_SYNC_TOPIC,
    DEFAULT_GAS_PRICE,
    BLACKLISTED_TKNS,
    STATIC_GAS_PRICE,
    ROUTER_ADDRESS,
    TIMEOUT_OFFSET,
    RPC_ENDPOINT,
    EXPLORER_URL,
    ENABLED_DEXS,
    MAX_GAS_COST,
    PRIVATE_KEY, 
    WS_ENDPOINT,
    BASE_ASSET,
    MIN_PROFIT,
    BLOCK_WAIT,
    DISPATCHER,
    FACTORIES,
    GAS_LIMIT,
    MAX_HOPS,
    DEX_NAME,
    NETWORK,
    ROUTERS,
    BOT_ID,
    ABIS,
}