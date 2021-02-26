const math = require('../math')
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
    let instr = {
        id: 'I0000', 
        pools: ['r1', 'r2', 'r3', 'r4'], 
        tkns: ['AVAX', 'ZETH', 'ZERO', 'USDC', 'AVAX']
    }
    let pools = {
        r1: {
            AVAX: ethers.utils.parseEther('24095'), 
            // AVAX: ethers.utils.parseEther('24000000'), 
            ZETH: ethers.utils.parseEther('279')
        },
        r2: {
            ZETH: ethers.utils.parseEther('508'), 
            ZERO: ethers.utils.parseEther('10482930')
        },
        r3: {
            USDC: ethers.utils.parseEther('906188'), 
            ZERO: ethers.utils.parseEther('9603134')
        }, 
        r4: {
            AVAX: ethers.utils.parseEther('40524'), 
            USDC: ethers.utils.parseEther('744384')
        }
    } 
    let path = [
        {
            tkns: [ 'AVAX', 'ZETH' ], 
            reserves: pools.r1
        }, {
            tkns: [ 'ZETH', 'ZERO' ], 
            reserves: pools.r2
        }, {
            tkns: [ 'ZERO', 'USDC' ], 
            reserves: pools.r3
        }, {
            tkns: [ 'AVAX', 'USDC' ], 
            reserves: pools.r4
        }
    ]

    function getReservePath(instr, reserves) {
        let reservePath = []
        for (let i=0; i<instr.pools.length; i++) {
            let r0 = reserves[instr.pools[i]][instr.tkns[i]]
            let r1 = reserves[instr.pools[i]][instr.tkns[i+1]]
            reservePath.push(r0)
            reservePath.push(r1)
        }
        return reservePath
    }

    let tokenPath = instr.tkns
    let t0 = process.hrtime()[1]
    let reservePath = getReservePath(instr, pools)
    let t1 = process.hrtime()[1]
    // console.log((t1-t0)/10**6)
    // console.log(reservePath.map(r=>r.toString()))


    let dA = ethers.utils.parseEther('100')
    // let t3 = process.hrtime()[1]
    let N = 1000
    let cummTimes = 0
    for (let i=0; i<N; i++) {
        let t3 = Date.now()
        let oa = math.getOptimalAmountForPath(reservePath)
        let t4 = Date.now()
        cummTimes += t4-t3
    }
    let oa = math.getOptimalAmountForPath(reservePath)
    // let t4 = process.hrtime()[1]
    console.log(cummTimes/N)
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

    }

}


function getAmountOut() {
    let instr = {
        id: 'I0000', 
        pools: ['r1', 'r2', 'r3', 'r4'], 
        tkns: ['AVAX', 'ZETH', 'ZERO', 'USDC', 'AVAX']
    }
    let reserves = {
        r1: {
            AVAX: ethers.utils.parseEther('24095'), 
            // AVAX: ethers.utils.parseEther('24000000'), 
            ZETH: ethers.utils.parseEther('279')
        },
        r2: {
            ZETH: ethers.utils.parseEther('508'), 
            ZERO: ethers.utils.parseEther('10482930')
        },
        r3: {
            USDC: ethers.utils.parseEther('906188'), 
            ZERO: ethers.utils.parseEther('9603134')
        }, 
        r4: {
            AVAX: ethers.utils.parseEther('40524'), 
            USDC: ethers.utils.parseEther('744384')
        }
    } 
    let path = [
        {
            tkns: [ 'AVAX', 'ZETH' ], 
            reserves: reserves.r1
        }, {
            tkns: [ 'ZETH', 'ZERO' ], 
            reserves: reserves.r2
        }, {
            tkns: [ 'ZERO', 'USDC' ], 
            reserves: reserves.r3
        }, {
            tkns: [ 'AVAX', 'USDC' ], 
            reserves: reserves.r4
        }
    ]

    function getReservePath(instr, reserves) {
        let reservePath = []
        for (let i=0; i<instr.pools.length; i++) {
            let r0 = reserves[instr.pools[i]][instr.tkns[i]]
            let r1 = reserves[instr.pools[i]][instr.tkns[i+1]]
            reservePath.push(r0)
            reservePath.push(r1)
        }
        return reservePath
    }
    let assetIn = 'AVAX'
    let amountIn = ethers.BigNumber.from('853824936282342229852')

    let amountOut1 = math.getAmountOutByPath(assetIn, amountIn, path)
    console.log(amountOut1)
    console.log('^'.repeat(50))
    let reservePath = getReservePath(instr, reserves)
    let amountOut2 = math.getAmountOutByReserves(amountIn, reservePath)
    console.log(amountOut2)
}

// getEaEb()
// getOptimal()
// amountsOut()
getAmountOut()
// pathAmountOut()