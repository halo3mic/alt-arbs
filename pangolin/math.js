const { BigNumber } = require('ethers')

let d1000 = BigNumber.from("1000");
let d997 = BigNumber.from("997");
const ZERO = BigNumber.from("0");
const ONE = BigNumber.from("1");
const TWO = BigNumber.from("2");

function sqrt(x) {
    let z = x.add(ONE).div(TWO);
    let y = x
    while (z.sub(y).isNegative()) {
        y = z
        z = x.div(z).add(z).div(TWO);
    }
    return y
}

function getNeighbour(array, caller) {
    return caller==array[0] ? array[1] : array[0]
}

function getEaEb(tokenIn, pairs) {
    let tokenMid = null
    let tokenOut = null
    let Ea = null
    let Eb = null
    let idx = 0
    for (let pair of pairs) {
        if (idx == 0) {
            tokenMid = getNeighbour(pairs[0].tkns, tokenIn)
        }
        if (idx == 1) {
            tokenOut = getNeighbour(pair.tkns, tokenMid)
            Ra = pairs[0].reserves[tokenIn]
            Rb = pairs[0].reserves[tokenMid]
            Rb1 = pair.reserves[tokenMid]
            Rc = pair.reserves[tokenOut]
            Ea = d1000.mul(Ra).mul(Rb1).div(d1000.mul(Rb1).add(d997.mul(Rb)))
            Eb = d997.mul(Rb).mul(Rc).div(d1000.mul(Rb1).add(d997.mul(Rb)))
            tokenIn = tokenOut
        }
        if (idx > 1) {
            tokenOut = getNeighbour(pair.tkns, tokenIn)
            Ra = Ea
            Rb = Eb
            Rb1 = pair.reserves[tokenIn]
            Rc = pair.reserves[tokenOut]
            Ea = d1000.mul(Ra).mul(Rb1).div(d1000.mul(Rb1).add(d997.mul(Rb)))
            Eb = d997.mul(Rb).mul(Rc).div(d1000.mul(Rb1).add(d997.mul(Rb)))
            tokenIn = tokenOut
        }
        idx += 1
    }
    return [ Ea, Eb ]
}

function getOptimalAmount(Ea, Eb) {
    if (Ea.lt(Eb)) {
        return sqrt(Ea.mul(Eb).mul(d997).mul(d1000)).sub(Ea.mul(d1000)).div(d997)
    }
}

function getAmountOut(amountIn, reserveIn, reserveOut) {
    if (amountIn*(reserveIn+reserveOut)==0) {
        return 0 
    }
    let taxedIn = d997.mul(amountIn)
    let numerator = taxedIn.mul(reserveOut)
    let denominator = d1000.mul(reserveIn).add(taxedIn)
    return numerator.div(denominator)
}

function getAmountOutByPath(tokenIn, amountIn, path) {
    var amountOut = amountIn
    var tokenOut = tokenIn
    for (let pair of path) {
        if (!pair.tkns.includes(tokenOut)) {
            throw new Error('Invalid path')
        }
        tokenOut = getNeighbour(pair.tkns, tokenIn)
        amountOut = getAmountOut(
            amountOut, 
            pair.reserves[tokenIn], 
            pair.reserves[tokenOut]
            )
        tokenIn = tokenOut
    }
    return amountOut
}

function getOptimalAmountForPath(tokenIn, pairs) {
    let result = getEaEb(tokenIn, pairs)
    return getOptimalAmount(...result) || ZERO
}


module.exports = { 
    getEaEb, 
    sqrt, 
    getOptimalAmount, 
    getAmountOut, 
    getAmountOutByPath, 
    getOptimalAmountForPath
}