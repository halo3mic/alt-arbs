const config = require('./config')
const ethers = require('ethers')
const { ABIS, ROUTERS, DISPATCHER } = require('./config')
const tokens = require('./config/tokens.json')
let tokensMap = Object.fromEntries(tokens.map(element => [element.id, element]))

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

    async formQueryTx(inputAmount, path) {
        // Input amount needs to in base units of asset (eg. wei)
        const queryContract = new ethers.Contract(
            config.ROUTERS.UNISH_PROXY, 
            ABIS['unishRouterProxy']
        )
        let tx = await queryContract.populateTransaction.getOutputAmount(
            this.routerAddress, 
            inputAmount, 
            path
        )
        // If input location is 0 input amount needs to be injected on the call
        const inputLocs = inputAmount==ethers.constants.Zero ? [88] : []  

        return { tx, inputLocs }
    }

    async formTradeTx(inputAmount, tokenPath, outputAmount=0, timeShift=300) {
        const baseAddress = tokensMap[config.BASE_ASSET].address
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        let tx
        if (tokenPath[0]==baseAddress) {
            tx = await this.routerContract.populateTransaction.swapExactETHForTokens(
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else if (tokenPath[tokenPath.length-1]==baseAddress) {
            tx = await this.routerContract.populateTransaction.swapExactTokensForETH(
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else {
            tx = await this.routerContract.populateTransaction.swapExactTokensForTokens(
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        }
        
        // If input location is 0 input amount needs to be injected in the calldata
        const inputLocs = inputAmount==ethers.constants.Zero && tokenPath[0]!=baseAddress ? [56] : []   // In bytes

        return { tx, inputLocs }
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

class Complus extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.COMPLUS
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
            ABIS['pangolinRouter'], 
            provider
        )
    }

    async formTradeTx(inputAmount, tokenPath, outputAmount=0, timeShift=300) {
        const baseAddress = tokensMap[config.BASE_ASSET].address
        const tradeTimeout = Math.round((Date.now()/1000) + timeShift)
        let tx
        if (tokenPath[0]==baseAddress) {
            tx = await this.routerContract.populateTransaction.swapExactAVAXForTokens(
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else if (tokenPath[tokenPath.length-1]==baseAddress) {
            tx = await this.routerContract.populateTransaction.swapExactTokensForAVAX(
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        } else {
            tx = await this.routerContract.populateTransaction.swapExactTokensForTokens(
                inputAmount,
                outputAmount, 
                tokenPath, 
                DISPATCHER, 
                tradeTimeout
            )
        }
        
        // If input location is 0 input amount needs to be injected in the calldata
        const inputLocs = inputAmount==ethers.constants.Zero && tokenPath[0]!=baseAddress ? [56] : []   // In bytes

        return { tx, inputLocs }
    }
}

class Yeti extends Pangolin {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.YETI
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['pangolinRouter'],
            provider
        )
    }
}

class YetiXYZ extends Pangolin {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.YETIXYZ
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['pangolinRouter'],
            provider
        )
    }
}

class Sushiswap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.SUSHISWAP
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class Elk extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.ELK
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class PandaSwap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.PANDASWAP
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class OliveSwap extends Uniswap {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.OLIVE
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['uniswapRouter'],
            provider
        )
    }
}

class Lydia extends Pangolin {

    constructor(provider) {
        super(provider)
        this.routerAddress = ROUTERS.LYDIA
        this.routerContract = new ethers.Contract(
            this.routerAddress, 
            ABIS['pangolinRouter'],
            provider
        )
    }
}

function getExchanges(provider) {
    return {
        zeroExchange: new ZeroExchange(provider), 
        sushiswap: new Sushiswap(provider),
        pandaswap: new PandaSwap(provider), 
        pangolin: new Pangolin(provider), 
        unnamed1: new Unnamed1(provider),
        olive: new OliveSwap(provider),
        complus: new Complus(provider), 
        baoSwap: new BaoSwap(provider), 
        yetiXYZ: new YetiXYZ(provider), 
        yetiswap: new Yeti(provider), 
        lydia: new Lydia(provider),
        elk: new Elk(provider),
    }   
}

module.exports = { getExchanges }
