const ethers = require('ethers')
const { ABIS, ROUTERS, WETH_ADDRESS, DISPATCHER } = require('../config')
const { tokens } = require('./instrManager')
const { convertTxDataToByteCode } = require('../utils')


class Uniswap {

    constructor(provider) {
        this.provider = provider
        this.routerAddress = ROUTERS.UNISWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'], 
            this.provider
        )
    }

    async fetchReservesRaw(poolAddress) {
        const poolContract = new ethers.Contract(
            poolAddress, 
            ABIS['uniswapPool'], 
            this.provider
        )
        return await poolContract.getReserves()
    }

    async getAmountOut(amountIn, path) {
        let routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'], 
            this.provider
        )
        return routerContract.getAmountsOut(amountIn, path).then(r => r[1])
    }

    async fetchReserves(pool) {
        const reserves = {}
        const reservesRaw = this.fetchReservesRaw(pool.address)
        const tkn1Dec = tokens[pool.tkns[0].id].decimal
        const r1 = {
            balance: await reservesRaw.then(
                r => parseFloat(ethers.utils.formatUnits(r[0], tkn1Dec))
            ),
            weight: 50
        }
        const tkn2Dec = tokens[pool.tkns[1].id].decimal
        const r2 = {
            balance: await reservesRaw.then(
                r => parseFloat(ethers.utils.formatUnits(r[1], tkn2Dec))
            ), 
            weight: 50
        }
        reserves[pool.tkns[0].id] = {
            'from': r1, 
            'to': r1
        }
        reserves[pool.tkns[1].id] = {
            'from': r2, 
            'to': r2
        }
        return reserves
    }

    async formQueryTx(fromToken, toToken, inputAmount) {
        // Input amount needs to in base units of asset (eg. wei)
        const queryContract = new ethers.Contract(
            UNIISH_ROUTER_PROXY, 
            ABIS['unishRouterProxy']
        )
        let queryTx = await queryContract.populateTransaction.getOutputAmount(
            this.routerAddress, 
            inputAmount, 
            fromToken, 
            toToken
        )
        queryTx = convertTxDataToByteCode(queryTx)
        // If input location is 0 input amount needs to be injected on the call
        const inputLocations = inputAmount==0 ? ["272"] : []  

        return { queryTx, inputLocations }
    }

    async formSwapTokensForExactTokens(tokenPath, outputAmount, amountInMax, timeShift=300) {
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        var tradePayload = await this.routerContract.populateTransaction.swapTokensForExactTokens(
            outputAmount, 
            amountInMax,
            tokenPath, 
            DISPATCHER, 
            tradeTimeout
        )
        const tradeTx = convertTxDataToByteCode(tradePayload)
        return tradeTx
    }

    async formTradeTx(tokenPath, inputAmount, outputAmount=0, timeShift=300, toBytecode=true) {
        // outputAmount being 0 can be very dangerous if tx sent by itself
        // timeShift is in seconds
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        if (tokenPath[0]==WETH_ADDRESS) {
            const method = 'swapExactETHForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else if (tokenPath[tokenPath.length-1]==WETH_ADDRESS) {
            const method = 'swapExactTokensForETH'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else {
            const method = 'swapExactTokensForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        }
        if (toBytecode) {
            tradeTx = convertTxDataToByteCode(tradeTx)
        }
        // If input location is 0 input amount needs to be injected on the call
        const inputLocations = inputAmount==0 && tokenPath[0]!=WETH_ADDRESS ? ["336"] : []  

        return { tradeTx, inputLocations }
    }
}

class Sushiswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.SUSHISWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Crypto extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.CRYPTO_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Linkswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.LINKSWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Polyient extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.POLYIENT_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Whiteswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.WHITESWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Sakeswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.SAKESWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Sashimiswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.SASHIMISWAP_ROUTER
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter']
        )
    }
}

class Mooniswap {

    constructor(provider) {
        this.provider = provider
    }


    async fetchReserves(pool) {
        const poolContract = new ethers.Contract(
            pool.address, 
            ABIS['mooniswapPool'], 
            this.provider
        )
        const [ tkn1, tkn2 ] = pool.tkns
        const balTkn1From = poolContract.virtualBalancesForAddition(
            tokens[tkn1.id].address
            ).then(
            r => parseFloat(ethers.utils.formatUnits(
                r[0], 
                tokens[tkn1.id].decimal
            ))
        )
        const balTkn1To = poolContract.virtualBalancesForRemoval(
            tokens[tkn1.id].address
            ).then(
            r => parseFloat(ethers.utils.formatUnits(
                r[0], 
                tokens[tkn1.id].decimal
            ))
        )
        const balTkn2From = poolContract.virtualBalancesForAddition(
            tokens[tkn2.id].address
            ).then(
            r => parseFloat(ethers.utils.formatUnits(
                r[0], 
                tokens[tkn2.id].decimal
            ))
        )
        const balTkn2To = poolContract.virtualBalancesForRemoval(
            tokens[tkn2.id].address
            ).then(
            r => parseFloat(ethers.utils.formatUnits(
                r[0], 
                tokens[tkn2.id].decimal
            ))
        )
        return Promise.all([balTkn1From, balTkn1To, balTkn2From, balTkn2To]).then((rs) => {
            const reserves = {}
            reserves[tkn1.id] = {
                from: {balance: rs[0], weight: 50}, 
                to: {balance: rs[1], weight: 50}
            }
            reserves[tkn2.id] = {
                from: {balance: rs[2], weight: 50}, 
                to: {balance: rs[3], weight: 50}
            }
            return reserves
        })
    }
}

class Balancer {

}

class Powerpool extends Balancer {

}

function getExchanges(provider) {
    return {
        uniswap: new Uniswap(provider), 
        sushiswap: new Sushiswap(provider), 
        linkswap: new Linkswap(provider), 
        crypto: new Crypto(provider), 
        mooniswap: new Mooniswap(provider),        
        polyient: new Polyient(provider), 
        whiteswap: new Whiteswap(provider),
        sashimiswap: new Sashimiswap(provider),
        sakeswap: new Sakeswap(provider),
    }   
}

module.exports = { getExchanges }
