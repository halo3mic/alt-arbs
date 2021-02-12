const { provider, signer } = require('./avaProvider')
const crossDex = require('./crossDex')

async function runWs() {
    await crossDex.initialize(provider, signer)
    provider.on("block", async (blockNumber) => {
        console.log("AVAX", blockNumber, new Date());
        crossDex.handleNewBlock(blockNumber);
    })
}

async function runHttp() {
    await crossDex.initialize(provider, signer)
    let lastBlockNum = 0
    while(1) {
        let currBlockNum = await provider.getBlockNumber()
        if (currBlockNum > lastBlockNum) {
            crossDex.handleNewBlock(currBlockNum)
            console.log("AVAX", currBlockNum, new Date())
            lastBlockNum = currBlockNum
        }
    }
}


// runWs()
runHttp()