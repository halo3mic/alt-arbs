const config = require('./config')
const ethers = require('ethers')
const { ABIS, ROUTERS, WETH_ADDRESS, DISPATCHER } = require('./config')
const { tokens } = require('./instrManager')


class Uniswap {

    constructor(provider) {
        this.provider = provider
        // this.routerAddress = null
        // this.routerContract = new ethers.Contract(
        //     this.routerAddress, 
        //     ABIS['uniswapRouter'], 
        //     this.provider
        // )
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

    // async formQueryTx(fromToken, toToken, inputAmount) {
    //     // Input amount needs to in base units of asset (eg. wei)
    //     const queryContract = new ethers.Contract(
    //         UNIISH_ROUTER_PROXY, 
    //         ABIS['unishRouterProxy']
    //     )
    //     let queryTx = await queryContract.populateTransaction.getOutputAmount(
    //         this.routerAddress, 
    //         inputAmount, 
    //         fromToken, 
    //         toToken
    //     )
    //     // If input location is 0 input amount needs to be injected on the call
    //     const inputLocations = inputAmount==0 ? ["272"] : []  

    //     return { queryTx, inputLocations }
    // }

    // async formSwapTokensForExactTokens(tokenPath, outputAmount, amountInMax, timeShift=300) {
    //     const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
    //     var tradeTx = await this.routerContract.populateTransaction.swapTokensForExactTokens(
    //         outputAmount, 
    //         amountInMax,
    //         tokenPath, 
    //         config.SIGNER_ADDRESS, 
    //         tradeTimeout
    //     )
    //     return tradeTx
    // }

    async formTradeTx(tokenPath, inputAmount, to, outputAmount=0, timeShift=300) {
        // outputAmount being 0 can be very dangerous if tx sent by itself
        // timeShift is in seconds
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        const baseAddress = tokens[config.BASE_ASSET].address
        if (tokenPath[0]==baseAddress) {
            const method = 'swapExactETHForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        } else if (tokenPath[tokenPath.length-1]==baseAddress) {
            const method = 'swapExactTokensForETH'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        } else {
            const method = 'swapExactTokensForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        }
        // If input location is 0 input amount needs to be injected on the call
        const inputLocations = inputAmount==0 && tokenPath[0]!=WETH_ADDRESS ? ["336"] : []  

        return { tradeTx, inputLocations }
    }
}

class ZeroExchange extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.ZERO_EXCHANGE
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class BaoSwap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.BAOSWAP
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class Unnamed1 extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.UNNAMED1
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class Pangolin extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.PANGOLIN
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'], 
            provider
        )
    }

    async formTradeTx(tokenPath, inputAmount, to, outputAmount=0, timeShift=300) {
        // outputAmount being 0 can be very dangerous if tx sent by itself
        // timeShift is in seconds
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        const baseAddress = tokens[config.BASE_ASSET].address
        if (tokenPath[0]==baseAddress) {
            const method = 'swapExactAVAXForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        } else if (tokenPath[tokenPath.length-1]==baseAddress) {
            const method = 'swapExactTokensForAVAX'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        } else {
            const method = 'swapExactTokensForTokens'
            var tradeTx = await this.routerContract.populateTransaction[method](
                inputAmount,
                outputAmount, 
                tokenPath, 
                to, 
                tradeTimeout
            )
        }
        // If input location is 0 input amount needs to be injected on the call
        const inputLocations = inputAmount==0 && tokenPath[0]!=WETH_ADDRESS ? ["336"] : []  

        return { tradeTx, inputLocations }
    }
}

function getExchanges(provider) {
    return {
        zeroExchange: new ZeroExchange(provider), 
        pangolin: new Pangolin(provider), 
        unnamed1: new Unnamed1(provider),
        baoSwap: new BaoSwap(provider), 
    }   
}

module.exports = { getExchanges }
