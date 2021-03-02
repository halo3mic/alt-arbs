const { ws } = require('../provider')
const arbbot = require('../arbbot')
const math = require('../math')
const ethers = require('ethers')


function getOptimalAmountWithMaps(paths, reservePaths) {
    let inputAmounts = []
    for (let i=0; i<paths.length; i++) {
        let optimalIn = math.getOptimalAmountForPathWithMap(reservePaths[i], paths[i].pools)
        if (optimalIn.gt('0')) {
            inputAmounts.push([
                paths[i].id, 
                parseFloat(ethers.utils.formatEther(optimalIn)).toFixed(2)
            ])
        }
    }
    return Object.fromEntries(inputAmounts)
}

function getOptimalAmountWithoutMaps(paths, reservePaths) {
    let inputAmounts = []
    for (let i=0; i<reservePaths.length; i++) {
        let optimalIn = math.getOptimalAmountForPath(reservePaths[i])
        if (optimalIn.gt('0')) {
            inputAmounts.push([
                paths[i].id, 
                parseFloat(ethers.utils.formatEther(optimalIn)).toFixed(2)
            ])
        }
    }
    return Object.fromEntries(inputAmounts)
}

function timeIt(fun, args, iterations) {
    // Run it N times to get average time
    let hrstart = Date.now()
    for (let i=0; i<iterations; i++) {
        fun(...args)
    }
    let diff = Date.now() - hrstart
    console.log(`Function ${fun.name} took ${diff/iterations} ms on average`)
}

async function timeArbForPath() {
    let iterations = 1000
    // Intialize and obtain data
    await arbbot.init(ws.provider, ws.signer)
    let paths = arbbot.getPaths()
    let arbAllPaths = () => paths.map(arbbot.arbForPath)
    timeIt(arbAllPaths, [], iterations)
}

async function amountOutWithVirtualReserves() {
    await arbbot.init(ws.provider, ws.signer)
    let paths = arbbot.getPaths()
    let path = paths[5]
    let reservePath = arbbot.getReservePath(path)
    let oa1 = math.getOptimalAmountForPathWithMap(reservePath, path.pools)
    let ao1 = math.getAmountOutByReserves(oa1, reservePath)
    console.log(oa1, ao1)
    let [oa2, ao2] = math.getOptimalAmountWithAmountOut(reservePath, path.pools)
    console.log(oa2, ao2)
}

async function main() {
    let iterations = 1000
    // Intialize and obtain data
    await arbbot.init(ws.provider, ws.signer)
    let paths = arbbot.getPaths()
    let reservePaths = paths.map(arbbot.getReservePath)
    // Check execution time for each method
    console.log(`\nGoing through ${iterations} iterations for each method`)
    timeIt(getOptimalAmountWithMaps, [paths, reservePaths], iterations)
    timeIt(getOptimalAmountWithoutMaps, [paths, reservePaths], iterations)
    // Compare results of two methods
    let withMapsResult = getOptimalAmountWithMaps(paths, reservePaths)
    let withoutMapsResult = getOptimalAmountWithoutMaps(paths, reservePaths)
    let uniquePaths = Array.from(new Set(...[
        Object.keys(withMapsResult),
        Object.keys(withoutMapsResult)
    ]))
    console.log('\nPathID || OaMapping || OaNoMapping')
    uniquePaths.forEach(path => {
        console.log(`${path} || ${withMapsResult[path]} || ${withoutMapsResult[path]}`)
    })
}

timeArbForPath()