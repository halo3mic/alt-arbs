const { provider, signer } = require('../avaProvider')
const zeroArb = require('../pangolin')
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

async function interactWithRouter() {
    console.log(await provider.getBlockNumber())
    let abi = require('../config/abis/uniswapRouter.json')
    let address = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"
    let contract = new ethers.Contract(address, abi, provider)
    let response = await contract.quote(1, 100, 1000)
    console.log(response)
}

async function interactWithPool() {
    console.log(await provider.getBlockNumber())
    let abi = require('../config/abis/uniswapPool.json')
    let address = "0xd2faF67643967815b8Ea89b7341383838204816d"
    let contract = new ethers.Contract(address, abi, provider)
    let response = await contract.name()
    console.log(response)
}

async function interactWithToken() {
    console.log(await provider.getBlockNumber())
    let abi = require('../config/abis/erc20.json')
    let address = "0xf20d962a6c8f70c731bd838a3a388D7d48fA6e15"
    let owner = "0xd11828308Fc7C84Ea31CCD398E609468d6D20713"
    let spender = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"
    let contract = new ethers.Contract(address, abi, provider)
    let response = await contract.allowance(owner, spender)
    console.log(response)
}

interactWithToken()