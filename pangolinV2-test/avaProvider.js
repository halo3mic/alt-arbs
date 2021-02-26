const dotenv = require('dotenv')
dotenv.config();
const ethers = require('ethers')
const ganache = require('ganache-cli')

const NETWORK = 43114
const PRIVATE_KEY_AVALANCHE = process.env.PRIVATE_KEY_AVALANCHE;
const WS_AVALANCHE = process.env.WS_AVALANCHE;
const RPC_AVALANCHE = process.env.RPC_AVALANCHE;


function getWsProvider() {
    let provider = new ethers.providers.WebSocketProvider(
      WS_AVALANCHE,
      NETWORK
    )
    provider.on("error", async (error) => {
      console.log("provider::wsAvalancheProvider::error", error);
    })
    return provider
}

function getHttpProvider() {
    return new ethers.providers.JsonRpcProvider(
        RPC_AVALANCHE,
        NETWORK
    )
}

function connectToGancheProvider(params, accountsPath) {
    params = params || {}
    params.fork = params.fork ? params.fork : WS_AVALANCHE
    params.network_id = NETWORK
    // params.default_balance_ether = ethers.utils.parseEther('1100')
    params.account_keys_path = accountsPath
    return new ethers.providers.Web3Provider(ganache.provider(params))
}

let wsProvider = getWsProvider()
let httpProvider = getHttpProvider()

let ws = {
    provider: wsProvider,
    signer: new ethers.Wallet(PRIVATE_KEY_AVALANCHE, wsProvider)
}
let http = {
  provider: httpProvider,
  signer: new ethers.Wallet(PRIVATE_KEY_AVALANCHE, httpProvider)
}
console.log(`Using acount ${http.signer.address} as signer.`)
module.exports = { http, ws, connectToGancheProvider, NETWORK }
