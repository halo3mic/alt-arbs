const dotenv = require('dotenv')
dotenv.config();

const ethers = require('ethers')

const NETWORK = 43114
const PRIVATE_KEY_AVALANCHE = process.env.PRIVATE_KEY_AVALANCHE;
const WS_AVALANCHE = process.env.WS_AVALANCHE;

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

const signer = new ethers.Wallet(PRIVATE_KEY_AVALANCHE, wsAvalancheProvider)

module.exports = { provider: wsAvalancheProvider, setProvider, signer, NETWORK }