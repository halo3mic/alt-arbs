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
    return wsAvalancheProvider
}
function setHttpProvider() {
    return new ethers.providers.JsonRpcProvider(
      RPC_AVALANCHE,
      NETWORK
  )
}
httpAvalancheProvider = setHttpProvider()
wsAvalancheProvider = setWsProvider()
let provider = wsAvalancheProvider
const signer = new ethers.Wallet(PRIVATE_KEY_AVALANCHE, wsAvalancheProvider)
module.exports = { provider, signer, NETWORK }
