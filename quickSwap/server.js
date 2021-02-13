const { provider, signer } = require('./maticProvider')
const zeroArb = require('./zeroArb')

zeroArb.initialize(provider, signer);

provider.on("block", async (blockNumber) => {
    console.log("MATIC", blockNumber, new Date());
    zeroArb.handleNewBlock(blockNumber);
});
