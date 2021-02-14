const dotenv = require('dotenv')
dotenv.config();
const ethers = require('ethers')
const NETWORK = 43114
const PRIVATE_KEY_AVALANCHE = process.env.PRIVATE_KEY_AVALANCHE;
const WS_AVALANCHE = process.env.WS_AVALANCHE;
const RPC_AVALANCHE = process.env.RPC_AVALANCHE;

function setWsProvider() {
    let wsAvalancheProvider = new ethers.providers.WebSocketProvider(
      WS_AVALANCHE,
      NETWORK
    )
    wsAvalancheProvider.on("error", async (error) => {
      console.log("provider::wsAvalancheProvider::error", error);
    })
}
function setHttpProvider() {
    return new ethers.providers.JsonRpcProvider(
      RPC_AVALANCHE,
      NETWORK
  )
}
<<<<<<< HEAD
httpAvalancheProvider = new ethers.providers.JsonRpcProvider(
  RPC_AVALANCHE,
  NETWORK
)
let provider = wsAvalancheProvider
const signer = new ethers.Wallet(PRIVATE_KEY_AVALANCHE, provider)
module.exports = { provider: provider, setProvider, signer, NETWORK }
=======
let httpAvalancheProvider = setHttpProvider()
let wsAvalancheProvider = setWsProvider()
let http = {
    provider: httpAvalancheProvider,
    signer: new ethers.Wallet(PRIVATE_KEY_AVALANCHE, httpAvalancheProvider)
}
let ws = {
    provider: wsAvalancheProvider,
    signer: new ethers.Wallet(PRIVATE_KEY_AVALANCHE, wsAvalancheProvider)
}

module.exports = { ws, http, NETWORK }
>>>>>>> 4886397f74e14575ac7a97afda79a77aafebb9e3
