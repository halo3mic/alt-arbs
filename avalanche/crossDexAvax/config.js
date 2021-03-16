const fs = require('fs')
const path = require('path')
const resolve = require('path').resolve
const dotenv = require('dotenv')
const ethers = require('ethers')

BOT_ID = 2
MAX_HOPS = 3
MIN_PROFIT = ethers.utils.parseUnits('0.1')
STATIC_GAS_PRICE = ethers.BigNumber.from('470')
GAS_LIMIT = '700000'
BASE_ASSET = 'T0000'
WAVAX_MAX_BAL = ethers.BigNumber.from('800')
BOT_BAL = ethers.utils.parseUnits('10000');
NETWORK = 43114
RPC_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc'
DISPATCHER = '0xd11828308Fc7C84Ea31CCD398E609468d6D20713'
ROUTERS = {
    ZERO_EXCHANGE: '0x85995d5f8ee9645cA855e92de16FA62D26398060',
    PANGOLIN: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', 
    BAOSWAP: '0x292A6375d6587883bBcabD96860b1834BA14601E', 
    UNNAMED1: '0xCE679504674F279ac389432c7fe330a48E117148', 
    YETI: '0x262DcFB36766C88E6A7a2953c16F8defc40c378A', 
    COMPLUS: '0x78c18E6BE20df11f1f41b9635F3A18B8AD82dDD1',
    YETIXYZ: '0x1643D9bb6d154c8729a678526F9Edb55DA44BAB7', 
    SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
}

function loadAllABIs() {
    // Loads all available ABIs in the memory
    const abisLocalPath = "../crossDexAvax/config/abis"
    const absPath = resolve(`${__dirname}/${abisLocalPath}`)
    const files = fs.readdirSync(absPath)
    const abis = Object.fromEntries(files.map(fileName => [
            fileName.split('.')[0], 
            require(path.join(abisLocalPath, fileName))
        ])
    )
    return abis
}
function getSecrets() {
    let result = dotenv.config()
    return process.env
}

BLACKLISTED_TKNS = [
    // 'T0019'
]

// MAX_INPUT_ETH = getBotBalance()
ABIS = loadAllABIs()
SECRETS = getSecrets()
module.exports = {
    ABIS,
    BLACKLISTED_TKNS,
    NETWORK, 
    RPC_PROVIDER_URL, 
    MIN_PROFIT,
    ROUTERS,
    SECRETS,
    WAVAX_MAX_BAL,
    GAS_LIMIT,
    BOT_BAL,
    BASE_ASSET, 
    DISPATCHER, 
    BOT_ID,
    MAX_HOPS,
    STATIC_GAS_PRICE
}