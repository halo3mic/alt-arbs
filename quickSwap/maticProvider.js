const dotenv = require('dotenv')
dotenv.config();
const ethers = require('ethers')
const NETWORK = 137
const PRIVATE_KEY = process.env.PRIVATE_KEY_MATIC;
const WS = process.env.WS_MATIC;
const RPC = process.env.RPC_MATIC;

var wsMaticProvider;
setProvider();

function setProvider() {
  wsMaticProvider = new ethers.providers.WebSocketProvider(WS, NETWORK);
  wsMaticProvider.on("error", async (error) => {
    console.log("provider::wsMaticProvider::error", error);
  })
}

// httpAvalancheProvider = new ethers.providers.JsonRpcProvider(RPC, NETWORK);

let provider = wsMaticProvider
const signer = new ethers.Wallet(PRIVATE_KEY, provider)
module.exports = { provider: provider, setProvider, signer, NETWORK }