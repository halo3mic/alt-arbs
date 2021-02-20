const dotenv = require('dotenv')
dotenv.config();
const ethers = require('ethers')
const ganache = require('ganache-cli')

const NETWORK = 43114
const PRIVATE_KEY_AVALANCHE = process.env.PRIVATE_KEY_AVALANCHE;
const WS_AVALANCHE = process.env.WS_AVALANCHE;
const RPC_AVALANCHE = process.env.RPC_AVALANCHE;
var wsAvalancheProvider;
setProvider();
function setProvider() {
  wsAvalancheProvider = new ethers.providers.WebSocketProvider(
    WS_AVALANCHE,
    NETWORK
  )
  wsAvalancheProvider.on("error", async (error) => {
    console.log("provider::wsAvalancheProvider::error", error);
  })
}
httpAvalancheProvider = new ethers.providers.JsonRpcProvider(
  RPC_AVALANCHE,
  NETWORK
)

function connectToGancheProvider(params, accountsPath) {
    params = params || {}
    params.fork = params.fork ? params.fork : uri
    params.network_id = 43114
    params.default_balance_ether = ethers.utils.parseEther('1100')
    params.account_keys_path = accountsPath
    return new ethers.providers.Web3Provider(ganache.provider(params))
}
let startGanacheProvider = (blockNumber)=>connectToGancheProvider({
    fork: WS_AVALANCHE+'@'+blockNumber.toString()
})
let provider = wsAvalancheProvider
const signer = new ethers.Wallet(PRIVATE_KEY_AVALANCHE, provider)
module.exports = { provider: provider, startGanacheProvider, setProvider, signer, NETWORK }