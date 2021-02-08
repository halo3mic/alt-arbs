/*
This is code for calculation of optimal buy amount for 2 step arbitrage on pools that have ratio between assets 50:50(Like on Uniswap).

Details:
    - Calculations
        - The calulation is based on the formula from www.desmos.com/calculator/nk9tzxezmn --> f(x)
        - The above formula was derived and steps can be seen here https://gitlab.com/blocklytics/archery/-/issues/174 --> f'(x)
    - Variables
        - A1 = TokenA reserves in pool 1
        - A2 = TokenA reserves in pool 2
        - B1 = TokenB reserves in pool 1
        - B2 = TokenB reserves in pool 2
        - F = Fees on the platform
     - Meanings
         - TokenA = Asset to start and end the trade with 
         - TokenB = Intermediate asset 
         - f'(x) represents the profit made by executing the trade with x tokens (start and end tokens need to be the same)
         - x represents the amount of tokens trade is started with 
         - The bigger root of f'(x)=0 represents the optimal start amount - where profit is the greatest
*/


function calcOptimalAmount(a1, b1, a2, b2, f1, f2) {
    q1 = 1 - f1
    q2 = 1 - f2
    a = b1**2*q1**2*q2**2 + 2*b1*b2*q1**2*q2 + b2**2*q1**2
    b = 2*b1*b2*a1*q1*q2 + 2*b2**2*a1*q1
    c = b2**2*a1**2 - b1*b2*a2*a1*q1*q2
    D_root = (b**2 - 4*a*c)**0.5
    root1 = (-b-D_root) / (2*a)
    root2 = (-b+D_root) / (2*a)

    return Math.max(root1, root2)
}

function calcAmountOut(amountIn, balFrom, balTo, fee) {
    const taxedAmount = amountIn*(1-fee)
    return taxedAmount*balTo/(balFrom+taxedAmount)
}

function calcAmountOutPrecise(amountIn, reserveIn, reserveOut, fee, feeDenom) {
    const taxedAmountIn = amountIn.mul(feeDenom.sub(fee))
    const numerator = taxedAmountIn.mul(reserveOut)
    const denominator = reserveIn.add(taxedAmountIn).mul(feeDenom)
    return numerator.div(denominator)
}

function calcAmountIn(amountOut, balFrom, balTo, fee) {
    const taxedAmount = amountOut-(amountOut*fee)
    return taxedAmount*balFrom/(balTo+taxedAmount)
}

function calcProfit(x, a1, b1, a2, b2, f1, f2) {
    const q1 = 1 - f1
    const q2 = 1 - f2
    const profit = -(x**2 * (q1*q2 *b1 + q1*b2) + x*(a1*b2 - a2*q1*q2 *b1)) / (x*(q1*q2 *b1 + q1*b2) + a1*b2)
 
    return profit
}

function calcSingleOptimalIn(rIn, rOut, targetPrice, fee) {
    const currentPrice = rIn/rOut
    const optimalAmount = rIn*((targetPrice/currentPrice*(1-fee))**0.5 - 1)*(1+fee)
    return optimalAmount
}

function calcSingleOptimalOut(rIn, rOut, targetPrice) {
    
}

function calculateUnweighted(args) {
    const optimalAmount = calcOptimalAmount(...args)
    if (optimalAmount > 0) {
        const profit = calcProfit(optimalAmount, ...args)
        return {
            'arbAvailable': true, 
            'optimalAmount': optimalAmount, 
            'profit': profit
        }
    } else {
        return {'arbAvailable': false}
    }
}


function evaluate(...params) {
    const [ ,,,,,, wP1T1, wP1T2, wP2T1, wP2T2] = params
    if (wP1T1==wP1T2 && wP2T1==wP2T2) {
        return calculateUnweighted(params.slice(0, -4))
    } else {
        throw new Error('Weighted pools not yet supported')
    }
}


module.exports = { calcAmountOutPrecise, evaluate, calcProfit, calcAmountOut, calcSingleOptimalIn, calcAmountIn, calcSingleOptimalOut }