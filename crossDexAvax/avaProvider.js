const dotenv = require('dotenv')
const ethers = require('ethers')
dotenv.config();

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

let provider = wsAvalancheProvider
const signer = new ethers.Wallet(PRIVATE_KEY_AVALANCHE, provider)
module.exports = { provider: provider, setProvider, signer, NETWORK }