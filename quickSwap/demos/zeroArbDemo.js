const { provider, signer } = require('../maticProvider')
const zeroArb = require('../zeroArb')
const paths = require('../config/paths.json')
const pools = require('../config/pools.json')
const { BigNumber } = require('ethers')
const ethers = require('ethers')
const math = require('../math')
const fs = require('fs')
const resolve = require('path').resolve

function findArbForPastBlock(blockNumber) {
    let path = './logs/reservesByBlock.json'
    let absScrtsPath = resolve(`${__dirname}/${path}`)
    let reserves = JSON.parse(fs.readFileSync(absScrtsPath, 'utf8'))[blockNumber]
    if (reserves) {
        let opps = zeroArb.findArbs(reserves)
        console.log(opps)
    } else {
        console.log('No such block saved')
    }
}

function findBestAmountIn() {
    let assetIn = 'wAVAX'
    let blockNumber = 50171-1
    let storagePath = './logs/reservesByBlock.json'
    let absScrtsPath = resolve(`${__dirname}/${storagePath}`)
    for (let path of paths) {
        let { tkns: tknPath, pools: poolsPath } = path
        let reservesAll = JSON.parse(fs.readFileSync(absScrtsPath, 'utf8'))[blockNumber]
        let pathFull = poolsPath.map(step => {
            return {
                tkns: pools.filter(p=>p.id==step)[0].tkns,
                reserves: reservesAll[step]
            }
        })
        console.log(tknPath)
        let dA = ethers.utils.parseEther('1')
        let oa = math.getOptimalAmountForPath(assetIn, pathFull)
        if (oa) {
            let options = [
                oa, 
                oa.sub(dA), 
                oa.add(dA)
            ]
            for (let option of options) {
                let amountOut = math.getAmountOutByPath(assetIn, option, pathFull)
                console.log(`Profit for ${ethers.utils.formatEther(option)}: ${ethers.utils.formatEther(amountOut.sub(option))}`)
            }
        }

    }
}

// async function unwrapAvaxDemo() {
//     zeroArb.initialize(provider, signer)
//     let amountIn = await zeroArb.getWAVAXBalance()
//     await zeroArb.unwrapAvax(amountIn, 0)

// } 

findBestAmountIn()
