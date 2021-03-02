const { setGancheProvider, ws } = require('../provider')
const arbbot = require('../arbbot')
const ethers = require('ethers')


async function timeitFindArbForPath() {
    let N = 1000
    await arbbot.init(ws.provider, ws.signer)
    let paths = arbbot.getPaths()
    let allPools = paths.map(path=>path.pools).flat()
    console.log(`Checking ${paths.length} paths`)
    // Run it N times to get average time
    let hrstart = Date.now()
    for (let i=0; i<N; i++) {
        paths.forEach(path=>arbbot.arbForPath(path))
    }
    let diff = Date.now() - hrstart
    console.log(`Call took ${diff/N} ms`)
}


timeitFindArbForPath()