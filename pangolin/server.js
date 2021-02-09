const { provider, signer } = require('./avaProvider')
const pangolin = require('./pangolin')

// pangolin.initialize(provider, signer)
// provider.on("block", async (blockNumber) => {
//     console.log("AVAX", blockNumber, new Date());
//     pangolin.handleNewBlock(blockNumber);
// })

async function run() {
    let lastBlockNum = 0
    while(1) {
        let currBlockNum = await provider.getBlockNumber()
        if (currBlockNum > lastBlockNum) {
            pangolin.handleNewBlock(currBlockNum)
            console.log("AVAX", currBlockNum, new Date())
            lastBlockNum = currBlockNum
        }
    }
}


run()