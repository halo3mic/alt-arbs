const { provider } = require('../../provider').ws
const resolve = require('path').resolve
const ethers = require('ethers')
const fs = require('fs')
const prompt = require('prompt-sync')()
const config = require('../../config')


class Manager {

    indexShift = 1

    getFromAddress(address) {
        const currentData = this.getCurrentData()
        if (this.isAdded(address)) {
            return currentData.filter(e=>e.address==address)[0]
        }
        return this.add(address, currentData)
    }

    isAdded(address) {
        return this.getCurrentData().map(e=>e.address.toLowerCase()).includes(address.toLowerCase())
    }

    async add(address, currentData) {
        if (!currentData) {
            currentData = this.getCurrentData()
        }
        if (this.isAdded(address)) {
            console.log(`Pool with address ${address} already added!`)
            return
        }
        const newElement = await this.queryData(address)
        newElement['id'] = this.getNewId()
        var ok = this.save(newElement)
        if (ok) {
            console.log(newElement)
            console.log('Saved!')
            return newElement
        }
        else {
            return this.getFromAddress(address)
        } 
    }

    getCurrentData() {
        try {
            return JSON.parse(fs.readFileSync(this.srcFilePath, 'utf8'))
        } catch {
            return []
        }
    }

    getNewId() {
        const ids = this.getCurrentData().map(e => {
            return parseInt(e.id.replace(this.prefix, '').replace('0', ''))
        })
        if (ids.length==0) {
            return this.prefix+'0000'
        }
        const newId = this.prefix + (Math.max(...ids)+this.indexShift).toString().padStart(4, '0')
        return newId
    }

    save(newElement) {
        try {
            if (this.isAdded(newElement.address)) {
                return
            }
            let updatedData = [...this.getCurrentData(), newElement]
            fs.writeFileSync(this.dstFilePath, JSON.stringify(updatedData, null, 4))
            return true
        } catch(e) {
            console.log('Couldnt save!')
            console.log(e)
            return 
        }
    }
}


class TokenManager extends Manager {

    dstFilePath = resolve(`${__dirname}/../../config/tokens.json`)
    srcFilePath = this.dstFilePath
    prefix = 'T'

    async queryData(address) {
        const tknData = {}
        // to checksum 
        try {
            var addressCS = ethers.utils.getAddress(address)
        } catch {
            console.log('Invalid address: ', address)
        }
        // token contract
        const tknContract = new ethers.Contract(
            addressCS,
            config.ABIS['erc20'],
            provider
        )
        const symbolExceptions = {
            // 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2: 'MKR'
        }
        tknData['address'] = addressCS
        tknData['symbol'] = addressCS in symbolExceptions ? symbolExceptions[addressCS] : await tknContract.symbol()
        tknData['decimal'] = await tknContract.decimals().then(d => d.toString())

        return tknData
    }
}

class PoolManager extends Manager {

    dstFilePath = resolve(`${__dirname}/../../config/pools.json`)
    srcFilePath = this.dstFilePath
    prefix = 'P'
    exchangeSymbols = {
        "Pangolin": "pangolin", 
        "ZERO": "zeroExchange", 
        "Uniswap": "uniswap", 
        "Complus": "complus"
    }

    async queryData(address) {
        try {
            var addressCS = ethers.utils.getAddress(address)
        } catch {
            console.log('Invalid address: ', address)
        }
        const poolContract = new ethers.Contract(
            addressCS,
            config.ABIS['erc20'],
            provider
        )

        const lpTknSymbol = await poolContract.name().then(s => s.split('-')[0].split(' ')[0])
        console.log(lpTknSymbol)
        if (!Object.keys(this.exchangeSymbols).includes(lpTknSymbol)) {
            let msg = 'Could not recognise exchange with LP token: '
            msg += lpTknSymbol + ' for pool with address ' + addressCS
            throw new Error(msg)
        } 
        const exchange = this.exchangeSymbols[lpTknSymbol]
        if (exchange=='balancer') {
            return this.queryBalancer(addressCS)
        } else if (exchange=='mooniswap') {
            return this.queryMooniswap(addressCS)
        } else {
            return this.queryUni(addressCS, exchange)
        }       
    }
    async queryUni(address, exchange) {
        const poolData = {}
        const poolContract = new ethers.Contract(
            address,
            config.ABIS['uniswapPool'],
            provider
        )
        poolData['address'] = address
        poolData['fee'] = 0.003
        const tknAdresses = [
            await poolContract.token0(), 
            await poolContract.token1()
        ]
        var tknMng = new TokenManager()
        var tkns = await Promise.all(tknAdresses.map(async tknAdd => {
            return await tknMng.getFromAddress(tknAdd)
        }))
        poolData['tkns'] = tkns.map(t => {
            return {id: t.id, weight: 0.5}
        })
        poolData['symbol'] = tkns.map(t => t.symbol).join('').toLowerCase()
        poolData['symbol'] += '_' + exchange
        poolData['exchange'] = exchange

        return poolData
    }
    async queryMooniswap(address) {
        const poolData = {}
        const poolContract = new ethers.Contract(
            address,
            config.ABIS['mooniswapPool'],
            provider
        )
        poolData['address'] = address
        poolData['fee'] = 0.003
        const tknAdresses = await poolContract.getTokens()
        if (tknAdresses.length==1) {
            tknAdresses.push('0x0000000000000000000000000000000000000000')
        }
        var tknMng = new TokenManager()
        var tkns = await Promise.all(tknAdresses.map(async tknAdd => {
            return await tknMng.getFromAddress(tknAdd)
        }))
        poolData['tkns'] = tkns.map(t => {
            return {id: t.id, weight: 0.5}
        })
        poolData['symbol'] = tkns.map(t => t.symbol).join('').toLowerCase()
        poolData['symbol'] += '_mooniswap'
        poolData['exchange'] = 'mooniswap'

        return poolData
    }
    async queryBalancer(address) {
        const poolData = {}
        const poolContract = new ethers.Contract(
            address,
            config.ABIS['balancerPool'],
            provider
        )
        await poolContract.isFinalized().then(r => {
            if (!r) {
                throw new Error(`Balancer pool with address ${address} is not finalized!`)
            }
        })
        poolData['address'] = address
        poolData['fee'] = await poolContract.getSwapFee().then(f => {
            return parseFloat(ethers.utils.formatUnits(f))
        })
        const tknAdresses = await poolContract.getFinalTokens()
        var tknMng = new TokenManager()
        var tkns = await Promise.all(tknAdresses.map(async tknAdd => {
            return await tknMng.getFromAddress(tknAdd)
        }))
        poolData['tkns'] = await Promise.all(tkns.map(async t => {
            return {
                id: t.id, 
                weight: await poolContract.getNormalizedWeight(t.address).then(w => {
                    return parseFloat(ethers.utils.formatUnits(w))
                })
            }
        }))
        poolData['symbol'] = tkns.map(t => t.symbol).join('').toLowerCase()
        poolData['symbol'] += '_balancer'
        poolData['exchange'] = 'balancer'
        
        return poolData
    }
}


class InstructionManager {

    srcPoolsPath = resolve(`${__dirname}/../../config/pools.json`)
    srcTokensPath = resolve(`${__dirname}/../../config/tokens.json`)
    dstInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
    srcInstrPath = this.dstInstrPath
    prefix = 'I'
    indexShift = 1

    constructor() {
        this.oldData = this.getCurrentData(this.srcInstrPath)
        this.tokens = this.getCurrentData(this.srcTokensPath)
        this.pools = this.getCurrentData(this.srcPoolsPath)
    }

    findPaths(pairs, tokenIn, tokenOut, maxHops, currentPairs, path, circles) {
        pairs = pairs
        tokenIn = tokenIn
        tokenOut = tokenOut
        maxHops = maxHops
        circles = circles || []
        currentPairs = currentPairs || []
        path = path || []
        for (let i=0; i<pairs.length; i++) {
            let newPath = path.length>0 ? [...path] : [tokenIn]
            let tempOut
            let pair = pairs[i]
            let pairTkns = pair.tkns.map(t=>t.id)
            if (tokenIn!=pairTkns[0] && tokenIn!=pairTkns[1]) {
                continue
            } else if (tokenIn==pairTkns[0]) {
                tempOut = pairTkns[1]
            } else {
                tempOut = pairTkns[0]
            }
            newPath.push(tempOut)
            if (tokenOut==tempOut && path.length>=2) {
                let c = { 'pools': [...currentPairs, pair.id], 'tkns': newPath }
                circles.push(c)
            } else if (maxHops > 1 && pairs.length > 1) {
                let pairsExcludingThisPair = [...pairs.slice(0,i), ...pairs.slice(i+1)]
                circles = this.findPaths(pairsExcludingThisPair, tempOut, tokenOut, maxHops-1, [...currentPairs, pair.id], newPath, circles)
            }
        }
        return circles
    }

    findInstructions() {
        let exchanges = [config.DEX_NAME.toLowerCase()]
        for (let exchange of exchanges) {
            let pools = this.pools.filter(p=>exchange==p.exchange.toLowerCase())
            console.log(pools)
            let paths = this.findPaths(
                pools, 
                config.INPUT_ASSET,
                config.INPUT_ASSET,
                config.MAX_HOPS
            )
            paths.forEach(p=>this.addInstruction(p, exchange))
        }
    }


    async addInstruction(path, exchange) {
        for (let i of this.oldData) {
            let check1 = i.pools.join() == path.pools.join()
            let check2 = i.tkns.join() == path.tkns.join()
            if (check1 && check2) {
                console.log('Path already added')
                return
            }
        }
        // Add instructions for pools both ways
        let tknRouteSymbol = path.tkns.map(tId=>this.tokens.filter(tObj=>tObj.id==tId)[0].symbol).join('=>').toLowerCase()
        let pathSymbol = tknRouteSymbol + '_' + exchange
        console.log(`Adding path ` + pathSymbol)

        let gasEstimate = '300000'
        let instrObj1 = {
            id: this.getNewId(), 
            symbol: tknRouteSymbol,
            tkns: path.tkns, 
            pools: path.pools, 
            enabled: true, 
            gasAmount: gasEstimate, 
        }
        console.log(instrObj1)
        this.saveInstr(instrObj1)
    }
    getCurrentData(path) {
        try {
            return JSON.parse(fs.readFileSync(path, 'utf8'))
        } catch {
            return []
        }
    }

    getNewId() {
        if (this.oldData.length==0) {
            return this.prefix+'0'.repeat(5)
        }
        const ids = this.oldData.map(e => {
            return parseInt(e.id.replace(this.prefix, '').replace('0', ''))
        })
        const newId = this.prefix + (Math.max(...ids)+this.indexShift).toString().padStart(5, '0')
        return newId
    }

    saveInstr(newInstr) {
        try {
            this.oldData.push(newInstr)
            fs.writeFileSync(this.dstInstrPath, JSON.stringify(this.oldData, null, 4))
            console.log('Instruction saved!')
            return true
        } catch(e) {
            console.log('Couldnt save!')
            console.log(e)
            return 
        }
    }
}


class ApprovalsManager {

    srcApprovalsPath = resolve(`${__dirname}/./new/approvals.json`)
    tknMng = new TokenManager()
    poolMng = new PoolManager()
    currentApprovals = this.getCurrentData(this.srcApprovalsPath)
    exchanges = getExchanges(provider)

    async getTknAllowance(tknAddress, spender) {
        return ganache.allowanceErc20(provider, tknAddress, DISPATCHER, spender)
    }

    async updateAllApprovals() {
        let approvalsNeeded = this.getApprovalsNeeded()
        Object.entries(approvalsNeeded).forEach(async a => {
            let [ tkn, spenders ] = a
            let allowances = {}
            for (let s of spenders) {
                let a = await this.getTknAllowance(tkn, s)
                allowances[s] = a
            }
            this.updateTknApprovals(tkn, allowances)
        })
        return true
    }

    getApprovalsNeeded() {
        let approvalsNeeded = {}
        let pools = this.poolMng.getCurrentData()
        let tkns = this.tknMng.getCurrentData()
        pools.forEach(p => {
            let spender = this.exchanges[p.exchange].routerAddress
            p.tkns.forEach(t => {
                let tknAddress = tkns.filter(tObj=>tObj.id==t.id)[0].address
                if (!Object.keys(approvalsNeeded).includes(tknAddress)) {
                    approvalsNeeded[tknAddress] = [spender]
                } else if (!approvalsNeeded[tknAddress].includes(spender)) {
                    approvalsNeeded[tknAddress].push(spender)
                }
            })
        })
        return approvalsNeeded
    }

    getUnapprovedBySpender() {
        let unapprovedTknsForSpender = {}
        Object.entries(this.currentApprovals).forEach(a => {
            let [ tkn, allowances ] = a
            Object.entries(allowances).forEach(s => {
                let [ spender, amount ] = s
                if (amount>7*10**28) {
                    return
                }
                if (!Object.keys(unapprovedTknsForSpender).includes(spender)) {
                    unapprovedTknsForSpender[spender] = []
                }
                unapprovedTknsForSpender[spender].push(tkn)
            })
        })
        return unapprovedTknsForSpender
    }

    async approve(spender, tokens) {
        let defaultPrice = 100e9
        let signer = keeperWallet(provider)
        let dispatcherContract = new ethers.Contract(DISPATCHER, config.ABIS['dispatcher'], signer)
        let tx = await dispatcherContract.populateTransaction.tokenAllowAll(tokens, spender)
        let gasAmount = await provider.estimateGas(tx)
        let gasPrice = await provider.getGasPrice()
        gasPrice = gasPrice > defaultPrice ? defaultPrice : gasPrice
        let cost = ethers.utils.formatEther(gasAmount.mul(gasPrice))
        console.log(`Gas cost of tx is ${cost} ETH,\nwith gas price of ${ethers.utils.formatUnits(gasPrice, 9)} gwei and gas amount of ${gasAmount}.`)
        let decision = await prompt('Proceed with transactions?')
        if (decision=='y') {
            let response = await signer.sendTransaction(tx)
            console.log('Pending tx at ', config.EXPLORER_URL+response.hash)
            await provider.waitForTransaction(response.hash)
        }
        
    }

    async approveAll() {
        let unapproved = this.getUnapprovedBySpender()
        for (let e of Object.entries(unapproved)) {
            console.log(`\nApproving ${e[1]} for spender ${e[0]}!`)
            await this.approve(...e)
        }
        console.log('\n\nSaving changes ... ')
        await this.updateAllApprovals()
        console.log('Finished!')
        
    }

    updateTknApprovals(tknAddress, allowances) {
        this.currentApprovals[tknAddress] = allowances
        this.save()
    }

    getCurrentData(path) {
        return JSON.parse(fs.readFileSync(path, 'utf8'))
    }

    save() {
        try {
            fs.writeFileSync(this.srcApprovalsPath, JSON.stringify(this.currentApprovals, null, 4))
            return true
        } catch(e) {
            console.log('Couldnt save!')
            console.log(e)
            return 
        }
    }
}

module.exports = { PoolManager, TokenManager, InstructionManager, ApprovalsManager }
