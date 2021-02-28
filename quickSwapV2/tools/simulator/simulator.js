const ganache = require('ganache-cli')
const ethers = require('ethers')
const fs = require('fs')
const paths = require('../../config/paths.json')
const tokens = require('../../config/tokens.json')
const pangolinABI = require('../../config/abis/uniswapRouter.json')
const wavaxABI = require('../../config/abis/weth.json')
const { Console } = require('console')
const { provider } = require('../../provider')

const uri = 'wss://ws-mainnet.matic.network'
const accountsPath = './tools/simulator/accounts.json'
const QUICKSWAP_ROUTER = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
const WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'

var PROVIDER, SIGNER

function fetchTestAccount(path) {
    let activeAccounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'))
    return Object.keys(activeAccounts.addresses)[0]
}

function connectToGancheProvider(params) {
    params = params || {}
    params.fork = params.fork ? params.fork : uri
    // params.fork = params.fork ? params.fork : url
    params.network_id = 137
    params.default_balance_ether = ethers.utils.parseEther('1100')
    params.account_keys_path = accountsPath
    return new ethers.providers.Web3Provider(ganache.provider(params))
}

// async function testAccountDemo() {
//     let provider = connectToGancheProvider()
//     let testAccount = fetchTestAccount()
//     let testAccountBalance = await provider.getBalance(testAccount)
    
//     console.log(testAccountBalance.toString())
// }

async function wrapAvax(amount) {
    let wavaxContract = new ethers.Contract(WMATIC, wavaxABI, SIGNER)
    let txWrap = await wavaxContract.deposit({ value: amount })
    let txApprove = await wavaxContract.approve(QUICKSWAP_ROUTER, amount)
    return Promise.all([
        PROVIDER.waitForTransaction(txWrap.hash),
        PROVIDER.waitForTransaction(txApprove.hash)
    ])
}

async function dummyTradeTokensToTokens(path, tradeAmount) {
    let dexContract = new ethers.Contract(
        QUICKSWAP_ROUTER, 
        pangolinABI, 
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

async function dummyTrade(path, tradeAmount) {
    let dexContract = new ethers.Contract(
        QUICKSWAP_ROUTER, 
        pangolinABI, 
        SIGNER
    )
    let tknAddressPath = path.tkns.map(t1=>tokens.filter(t2=>t2.id==t1)[0].address)
    let tx = await dexContract.swapExactAVAXForTokens(
        ethers.constants.Zero,
        tknAddressPath,
        SIGNER._address,
        Date.now()+180, 
        { value: tradeAmount }
    )
    return PROVIDER.waitForTransaction(tx.hash);
}

function updateGasEstimate(pathId, newEstimate) {
    let pathToFile = './config/paths.json'
    modified = paths.map(path => {
        path.gasAmount = path.id==pathId ? newEstimate : path.gasAmount
        return path
    })
    try {
        fs.writeFileSync(pathToFile, JSON.stringify(paths, null, 4))
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
      setTimeout(resolve, ms);
    });
  } 

async function tradeWithTestAccount() {
    PROVIDER = connectToGancheProvider()
    let testAccount = fetchTestAccount()
    
    // let testPaths = paths.filter(p=>p.gasAmount==300000) // Only run instructions that still have default gas amount value
    let testPaths = paths
    SIGNER = PROVIDER.getSigner(testAccount)
    let wrapAmount = ethers.utils.parseEther('999')
    let tradeAmount = ethers.utils.parseEther('1')
    await wrapAvax(wrapAmount).then(()=>console.log('Wrapping finished!'))
    for (let path of testPaths) {
        try {
            let txReceipt = await dummyTradeTokensToTokens(path, tradeAmount)
            new ethers.Contract(WMATIC, wavaxABI, SIGNER).getBalance()
            console.log(txReceipt)
            break
            let gasUsed = txReceipt.gasUsed.toString()
            // updateGasEstimate(path.id, gasUsed)
            console.log(`Gas estimate for ${path.id}: ${gasUsed}`)
            await sleep(2)
        } catch {
            console.log(`Path ${path.id} failed to execute trade tx!`)
        }
    }
}

async function simulateTradeForPath(blockNumber, pathId, inputAmount) {
    let fork = WS + '@' + blockNumber.toString()
    let ganacheArgs = { fork, account_keys_path: accountsPath }
    PROVIDER = connectToGancheProvider(ganacheArgs)
    let testAccount = fetchTestAccount()
    SIGNER = PROVIDER.getSigner(testAccount)
    await wrapAvax(inputAmount).then(()=>console.log('Wrapping finished!'))
    let txReceipt = await dummyTradeTokensToTokens(path, tradeAmount)
    console.log(txReceipt)
}

async function repeatTx(txHash) {
    // let tx = await provider.getTransaction(txHash)
    // console.log(tx)
    // tx.blockNumber -= 1
    // tx.transactionIndex = 10
    // let response = await provider.call(tx)
    // let fork = WS + '@' + txReceipt.blockNumber.toString()
    // let ganacheArgs = { fork, unlock: [txReceipt.from] }
    // let forkedProvider = connectToGancheProvider(ganacheArgs)
    // let signer = forkedProvider.getSigner(txReceipt.from)
    // let tx = {
    //     to: txReceipt.from, 
    //     data: txReceipt.
    // }
    // let txResponse = signer.sendTransaction(tx)
    let receipt = await provider.getTransactionReceipt(txHash)
    console.log(receipt)
}

function main() {
    let txHash = '0x38fe7d35a86775977c6e5c49a2de6236307c7c8d97cedb447fc64019d7c20deb'
    repeatTx(txHash)
}

tradeWithTestAccount()
// main()