/* Module establish and manage the connection to web3 provider */
const ethers = require('ethers')
const constants = require('./constants')
const secrets = require('./secrets')
const ganache = require("ganache-cli");
PROVIDER_OPTIONS = require(constants.PROVIDERS_PATH)

// Get URI
function getProvidersUri(providerName) {
    const secret = secrets.providerScrt(providerName)
    const uri = PROVIDER_OPTIONS[constants.WS_PROVIDER].wsPath.replace('<<TOKEN>>', secret)
    return uri
}

// Get URL
function getProvidersUrl(providerName) {
    const secret = secrets.providerScrt(providerName)
    const url = PROVIDER_OPTIONS[constants.HTTP_PROVIDER].httpPath.replace('<<TOKEN>>', secret)
    return url
}

function connectToWsProvider(providerName=constants.WS_PROVIDER) {
    let web3 = new ethers.providers.WebSocketProvider(
        getProvidersUri(providerName),
        constants.NETWORK
    )  
    web3.on("error", async (error) => {
        console.log("provider::error", error);
    })

    return web3
}

function connectToHttpProvider(providerName=constants.HTTP_PROVIDER) {
    const web3 = new ethers.providers.JsonRpcProvider(
        getProvidersUrl(providerName),
        constants.NETWORK
    )  
    web3.on("error", async (error) => {
        console.log("provider::error", error);
    })
    web3.on("resync", async (error) => {
        console.log("Connection to the provider was lost")
        web3 = connectToWsProvider()
    })
    return web3
}

function connectToGancheProvider(params) {
   const url = getProvidersUrl(constants.HTTP_PROVIDER)
   params = params || {}
   params.fork = params.fork ? params.fork : url
   return new ethers.providers.Web3Provider(ganache.provider(params));
}

const keeperWallet = provider => new ethers.Wallet(secrets.GROUNDKEEPER_PK, provider)

const provider = connectToWsProvider()  // Create default provider
module.exports = {
    provider, 
    connectToWsProvider, 
    connectToHttpProvider, 
    connectToGancheProvider, 
    keeperWallet, 
    getProvidersUrl
}