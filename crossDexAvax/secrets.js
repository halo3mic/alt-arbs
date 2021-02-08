// This module is separate for security reasons 

const resolve = require('path').resolve
const constants = require('./constants')
const absScrtsPath = resolve(`${__dirname}/${constants.ENV_PATH}`)
require('dotenv').config({path: absScrtsPath})

function providerScrt (provider) {
    const providerKey = provider.toUpperCase() + '_TOKEN'
    const scrt = process.env[providerKey] 
    return scrt
}

providerScrt("chainstackBlocklytics")
module.exports.providerScrt = providerScrt
module.exports.ARCHER_API_KEY = process.env.ARCHER_API_TOKEN
module.exports.GROUNDKEEPER_PK = process.env.PK_0x103c7BEC38a948b738A430B2b685654dd95bE0A5