const math = require('./math')
const { BigNumber, ethers } = require('ethers')


function getEaEb() {
    let tknIn = 'ETH'
    let r1 = {
        YFI: BigNumber.from(100), 
        ETH: BigNumber.from(3300)
    }
    let r2 = {
        YFI: BigNumber.from(100), 
        USDC: BigNumber.from(4000000)
    }
    let r3 = {
        ETH: BigNumber.from(80), 
        USDC: BigNumber.from(80000)
    } 
    let pairs = [
        {
            tkns: [ 'YFI', 'ETH' ], 
            reserves: r1
        }, {
            tkns: [ 'USDC', 'YFI' ], 
            reserves: r2
        }, {
            tkns: [ 'USDC', 'ETH' ], 
            reserves: r3
        }
    ]
    let [ea, eb] = math.getEaEb(tknIn, pairs)
    console.log(ea.toString(), eb.toString())
}


function getSqrt() {
    let inputNum = BigNumber.from(16)
    let r = math.sqrt(inputNum)
    console.log(r)
}

function getOptimal() {
    let [ ea, eb ] = [ BigNumber.from(63), BigNumber.from(76) ]
    let r = math.getOptimalAmount(ea, eb)
    console.log(r.toString())
}

function amountsOut() {
    let optimalIn = BigNumber.from(17)
    let r1 = {
        ETH: BigNumber.from(100), 
        USDC: BigNumber.from(200)
    }
    let r2 = {
        ETH: BigNumber.from(100), 
        USDC: BigNumber.from(800)
    } 
    let midBal = math.getAmountOut(optimalIn, r2['ETH'], r2['USDC'])
    let finalBal = math.getAmountOut(midBal, r1['USDC'], r1['ETH'])
    console.log(midBal.toString())
    console.log(finalBal.toString())
    console.log(finalBal.sub(optimalIn).toString())
}

function pathAmountOut() {
    let startAsset = 'ETH'
    let optimalIn = BigNumber.from(600)
    let r1 = {
        YFI: BigNumber.from(10000), 
        ETH: BigNumber.from(330000)
    }
    let r2 = {
        YFI: BigNumber.from(10000), 
        USDC: BigNumber.from(400000000)
    }
    let r3 = {
        ETH: BigNumber.from(8000), 
        USDC: BigNumber.from(8000000)
    } 
    let path = [
        {
            tkns: [ 'YFI', 'ETH' ], 
            reserves: r1
        }, {
            tkns: [ 'USDC', 'YFI' ], 
            reserves: r2
        }, {
            tkns: [ 'USDC', 'ETH' ], 
            reserves: r3
        }
    ]
    let amountOut = math.getAmountOutByPath(startAsset, optimalIn, path)
    console.log(amountOut.toString())
}


function findBestAmountIn() {
    let assetIn = 'AVAX'
    // make some dummy data
    let r1 = {
        AVAX: ethers.utils.parseEther('24095'), 
        ZETH: ethers.utils.parseEther('279')
    }
    let r2 = {
        ZETH: ethers.utils.parseEther('508'), 
        ZERO: ethers.utils.parseEther('10482930')
    }
    let r3 = {
        USDC: ethers.utils.parseEther('906188'), 
        ZERO: ethers.utils.parseEther('9603134')
    } 
    let r4 = {
        AVAX: ethers.utils.parseEther('40524'), 
        USDC: ethers.utils.parseEther('744384')
    } 
    let path = [
        {
            tkns: [ 'AVAX', 'ZETH' ], 
            reserves: r1
        }, {
            tkns: [ 'ZETH', 'ZERO' ], 
            reserves: r2
        }, {
            tkns: [ 'ZERO', 'USDC' ], 
            reserves: r3
        }, {
            tkns: [ 'AVAX', 'USDC' ], 
            reserves: r4
        }
    ]
    // get optimal amount
    let dA = ethers.utils.parseEther('100')
    let oa = math.getOptimalAmountForPath(assetIn, path)
    if (oa) {
        let options = [
            oa, 
            oa.sub(dA), 
            oa.add(dA)
        ]
        for (let option of options) {
            let amountOut = math.getAmountOutByPath(assetIn, option, path)
            console.log(`Profit for ${option}: ${amountOut.sub(option)}`)
        }
        // console.log('^'.repeat(50))
        // console.log(r1['AVAX'].toString(), r1['ZETH'].toString())
        // amountIn = ethers.utils.parseEther('100')
        // console.log(amountIn.toString())
        // amountOut = math.getAmountOut(amountIn, r1['AVAX'], r1['ZETH'])
        // console.log(amountOut.toString())
    }
    //  get profit for this amount
    // get profit for +- dA 
}




// Try multiple paths


// getEaEb()
// getOptimal()
// amountsOut()
findBestAmountIn()