const constants = require('./constants')
const fs = require('fs')
const path = require('path')
const resolve = require('path').resolve
const { provider } = require('./provider')
const { BigNumber, utils } = require('ethers')



function loadAllABIs() {
    // Loads all available ABIs in the memory
    const absPath = resolve(`${__dirname}/${constants.ABIS_PATH}`)
    const files = fs.readdirSync(absPath)

    const abis = Object.fromEntries(files.map(fileName => [
            fileName.split('.')[0], 
            require(path.join(constants.ABIS_PATH, fileName))
        ])
    )
    return abis
}

async function getDispatcherBalance() {
    return await provider.getBalance(constants.DISPATCHER).then(
        b => parseFloat(utils.formatEther(b))
    )
}

// function initProviderUris() {
//     scrtsArray = Object.keys(obj).map((key) => [Number(key), obj[key]])
//     const secret = secrets.providerScrt(providerName)
//     return PROVIDER_OPTIONS[constants.WS_PROVIDER].wsPath.replace('<<TOKEN>>', secret)
// }

MAX_INPUT_ETH = getDispatcherBalance()
// MAX_INPUT_ETH = 28*10**18
ABIS = loadAllABIs()
// FEE_DENOMINATOR = BigNumber.from('10000')
// WEIGHT_DENOMINATOR = BigNumber.from('100')



module.exports = {
    ABIS,
    PROVIDER_OPTIONS,
    MAX_INPUT_ETH,
    // FEE_DENOMINATOR, 
    // WEIGHT_DENOMINATOR,
    ...constants
}