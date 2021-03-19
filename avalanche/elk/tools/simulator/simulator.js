const tokens = require('../../config/tokens.json')
const paths = require('../../config/paths.json')
const provider = require('../../provider')
const config = require('../../config')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')
const { Console } = require('console')
const { ws } = require('../../../yetixyz/provider')

const ACCOUNTS_PATH = './accounts.json'
let PROVIDER
let SIGNER

function fetchTestAccount() {
    let activeAccounts = require(ACCOUNTS_PATH)
    return Object.keys(activeAccounts.addresses)[0]
}

function connectToGancheProvider(args) {
    const absPath = path.resolve(`${__dirname}/${ACCOUNTS_PATH}`)
    let ganacheArgs = {
        default_balance_ether: ethers.utils.parseEther('11000'), 
        account_keys_path: absPath
    }
    ganacheArgs = {...ganacheArgs, ...args}
    return provider.setGancheProvider(ganacheArgs)
}

async function getWrappedBalance() {
    let wrappedTokenAddress = tokens.filter(
        t => t.id==config.INPUT_ASSET
    )[0].address 
    let wrapContract = new ethers.Contract(
        wrappedTokenAddress, 
        config.ABIS['weth'], 
        SIGNER
    )
    return wrapContract.balanceOf(SIGNER._address)
}

async function wrapChainToken(amount) {
    let wrappedTokenAddress = tokens.filter(
        t => t.id==config.INPUT_ASSET
    )[0].address 
    let wrapContract = new ethers.Contract(
        wrappedTokenAddress, 
        config.ABIS['weth'], 
        SIGNER
    )
    let txWrap = await wrapContract.deposit({ value: amount })
    let txApprove = await wrapContract.approve(config.ROUTER_ADDRESS, amount)
    return Promise.all([
        PROVIDER.waitForTransaction(txWrap.hash),
        PROVIDER.waitForTransaction(txApprove.hash)
    ])
}

async function tradeTokensToTokens(path, tradeAmount) {
    let dexContract = new ethers.Contract(
        config.ROUTER_ADDRESS, 
        config.ABIS['uniswapRouter'], 
        SIGNER
    )
    let tknAddressPath = path.tkns.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await dexContract.swapExactTokensForTokens(
        tradeAmount,
        ethers.constants.Zero,
        tknAddressPath,
        SIGNER._address,
        Date.now()+180
    )
    return PROVIDER.waitForTransaction(tx.hash);
}

async function getTradeTokensToTokens(path, tradeAmount) {
    let dexContract = new ethers.Contract(
        config.ROUTER_ADDRESS, 
        config.ABIS['uniswapRouter'], 
        SIGNER
    )
    let tknAddressPath = path.tkns.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await dexContract.populateTransaction.swapExactTokensForTokens(
        tradeAmount,
        ethers.constants.Zero,
        tknAddressPath,
        SIGNER._address,
        Date.now()+180
    )
    return tx
}

function updateGasEstimate(pathId, newEstimate) {
    let pathToFile = '../../config/paths.json'
    const absPath = path.resolve(`${__dirname}/${pathToFile}`)
    modified = paths.map(path => {
        path.gasAmount = path.id==pathId ? newEstimate : path.gasAmount
        return path
    })
    try {
        fs.writeFileSync(absPath, JSON.stringify(paths, null, 4))
        console.log('Gas amount updated!')
        return true
    } catch(e) {
        console.log('Couldnt save!')
        console.log(e)
        return 
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
} 

async function estimateGasAmount() {
    PROVIDER = connectToGancheProvider()
    let testAccount = fetchTestAccount()
    SIGNER = PROVIDER.getSigner(testAccount)
    
    let testPaths = paths.filter(p=>p.gasAmount==300000 && p.enabled) // Only run instructions that still have default gas amount value
    let wrapAmount = ethers.utils.parseEther('11000')
    let tradeAmount = ethers.utils.parseEther('1')
    try {
        await wrapChainToken(wrapAmount).then(()=>console.log('Wrapping finished!'))
    } catch (e) {
        console.log(e)
    }
    for (let path of testPaths) {
        try {
            let tx = getTradeTokensToTokens(path, tradeAmount)
            let gasUsed = await PROVIDER.estimateGas(tx).then(tx=>tx.toString())
            updateGasEstimate(path.id, gasUsed)
            console.log(`Gas estimate for ${path.id}: ${gasUsed}`)
            // await sleep(2)
        } catch {
            console.log(`Path ${path.id} failed to execute trade tx!`)
        }
    }
}

async function findPastOpps() {
    let forkBlock = 533653
    let fork = `${provider.ws.endpoint}@${forkBlock}`
    let unlocked_accounts = [provider.ws.signer.address]
    PROVIDER = connectToGancheProvider({fork, unlocked_accounts})
    let testAccount = fetchTestAccount()
    SIGNER = PROVIDER.getSigner(provider.ws.signer.address)
    SIGNER.address = SIGNER._address
    console.log(await PROVIDER.getBlockNumber())
    const arbbot = require('../../arbbot')
    await arbbot.init(PROVIDER, SIGNER)
    // console.log(arbbot.getReserves())
    let allOpps = arbbot.getPaths().map(path=>arbbot.arbForPath(path)).filter(e=>e)
    console.log(allOpps)

    const filter = { topics: [config.UNISWAP_SYNC_TOPIC] }
    let logs = await PROVIDER.getLogs(filter)
    console.log(logs)
}

async function replayTx() {
    let txHash = '0x03aa6e903ec490211a667a9459eb2084e27d978e87e22604c82ef352b62817c8'
    let txObject = await provider.ws.provider.getTransaction(txHash)
    let txSend = {
        from: txObject.from,
        to: txObject.to,
        data: txObject.data,
    }

    let forkBlock = txObject.blockNumber
    let fork = `${provider.ws.endpoint}@${forkBlock}`
    let unlocked_accounts = [provider.ws.signer.address]
    PROVIDER = connectToGancheProvider({fork, unlocked_accounts})
    SIGNER = PROVIDER.getSigner(provider.ws.signer.address)
    try {
        let txReplay = await SIGNER.sendTransaction(txSend)
        let txReplayReceipt = await provider.ws.provider.getTransactionReceipt(txReplay)
        console.log(txReplayReceipt)
    } catch (e) {
        console.log(e)
    }
}

replayTx()