const { provider, signer } = require('./provider')
const crossDex = require('./crossDex')

async function run() {
    crossDex.initialize(provider, signer)
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


run()