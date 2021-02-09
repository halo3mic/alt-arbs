const crossDex = require('../crossDex')
const { provider, signer } = require('../provider')



async function findBestOpp() {
    crossDex.initialize(provider)
    let bestOpp = await crossDex.findBestOpp()
    // console.log(bestOpp)
}


findBestOpp()

