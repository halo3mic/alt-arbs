const { http, ws } = require('./avaProvider')
const pangolin = require('./pangolin')

async function runWs() {
    let { provider, signer } = ws
    await pangolin.initialize(provider, signer)
    provider.on("block", async (blockNumber) => {
        console.log("AVAX", blockNumber, new Date());
        pangolin.handleNewBlock(blockNumber);
    })
}

async function runHttp() {
    let { provider, signer } = http
    await pangolin.initialize(provider, signer)
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


// runWs()
runHttp()