const fs = require('fs')
const path = require('path')
const resolve = require('path').resolve
const dotenv = require('dotenv')
const ethers = require('ethers')


BASE_ASSET = 'T0002'
WAVAX_MAX_BAL = "800";
GAS_LIMIT = "400000";
BOT_BAL = ethers.utils.parseUnits('10000');
NETWORK = 43114
RPC_PROVIDER_URL = 'https://api.avax.network/ext/bc/C/rpc'
SIGNER_ADDRESS = '0x103c7BEC38a948b738A430B2b685654dd95bE0A5'
ROUTERS = {
    ZERO_EXCHANGE: '0x85995d5f8ee9645cA855e92de16FA62D26398060',
    PANGOLIN: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', 
    BAOSWAP: '0x292A6375d6587883bBcabD96860b1834BA14601E', 
    UNNAMED1: '0xCE679504674F279ac389432c7fe330a48E117148'
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

// MAX_INPUT_ETH = getBotBalance()
ABIS = loadAllABIs()
SECRETS = getSecrets()
module.exports = {
    ABIS,
    NETWORK, 
    RPC_PROVIDER_URL, 
    ROUTERS,
    SECRETS,
    WAVAX_MAX_BAL,
    GAS_LIMIT,
    BOT_BAL,
    BASE_ASSET, 
    SIGNER_ADDRESS
}