const ganache = require('ganache-cli')
const config = require('./config.js') 
const ethers = require('ethers')

/**
 * Return WebSocket provider object
 * @returns {ethers.providers.WebSocketProvider}
 */
function setWsProvider() {
    let _wsProvider = new ethers.providers.WebSocketProvider(
      config.WS_ENDPOINT,
      config.NETWORK
    )
    _wsProvider.on("error", async (error) => {
      console.log("provider::error", error);
    })
    return _wsProvider
}

/**
 * Return RPC provider object
 * @returns {ethers.providers.JsonRpcProvider}
 */
function setHttpProvider() {
    return new ethers.providers.JsonRpcProvider(
      config.RPC_ENDPOINT,
      config.NETWORK
    )
}

/**
 * Return ganache provider 
 * See https://github.com/trufflesuite/ganache-cli
 * @param {Object} params - Session configuration
 * @returns {ethers.providers.Web3Provider}
 */
function setGanacheProvider(params) {
    params = params || {}
    params.fork = params.fork ? params.fork : config.WS_ENDPOINT
    params.network_id = config.NETWORK
    return new ethers.providers.Web3Provider(ganache.provider(params))
}

function init() {
	let httpProvider = setHttpProvider()
	let wsProvider = setWsProvider()
	let http = {
		signer: new ethers.Wallet(config.PRIVATE_KEY, httpProvider), 
		endpoint: config.RPC_ENDPOINT,
		provider: httpProvider,
	}
	let ws = {
		signer: new ethers.Wallet(config.PRIVATE_KEY, wsProvider), 
		endpoint: config.WS_ENDPOINT,
		provider: wsProvider,
	}
	console.log(`Using acount ${ws.signer.address} as signer.`)
	return { 
		network: config.NETWORK, 
		setGanacheProvider,
		http, 
		ws, 
	}
}

module.exports = init()
