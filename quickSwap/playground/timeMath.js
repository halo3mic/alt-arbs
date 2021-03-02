const { setGancheProvider, ws } = require('../provider')
const arbbot = require('../arbbot')
const ethers = require('ethers')


async function main() {
    // let blockNumber = 11487535
    // let fork = ws.endpoint + '@' + blockNumber.toString()
    // let forkProvider = setGancheProvider({fork, unlock: [ws.signer.address]})
    // let forkSigner = forkProvider.getSigner(ws.signer.address)
    await arbbot.init(ws.provider, ws.signer)
    let paths = arbbot.getPaths()
    let hrstart = process.hrtime()
    paths.forEach(path=>arbbot.arbForPath(path))
    let diff = process.hrtime(hrstart)[1]
    console.log(diff/1e6)
}



main()