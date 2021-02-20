const ganache = require('ganache-cli')
const ethers = require('ethers')
const fs = require('fs')
const paths = require('../../config/paths.json')
const tokens = require('../../config/tokens.json')
const uniswapABI = require('../../config/abis/uniswapRouter.json')
const wavaxABI = require('../../config/abis/weth.json')

const url = "https://api.avax.network/ext/bc/C/rpc"
const uri = 'ws://127.0.0.1:9650/ext/bc/C/ws'
const accountsPath = './tools/simulator/accounts.json'
const ZERO_ROUTER = '0x85995d5f8ee9645cA855e92de16FA62D26398060'
const WAVAX = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'

var PROVIDER, SIGNER

function fetchTestAccount(path) {
    let activeAccounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'))
    return Object.keys(activeAccounts.addresses)[0]
}

function connectToGancheProvider(params) {
    params = params || {}
    params.fork = params.fork ? params.fork : uri
    // params.fork = params.fork ? params.fork : url
    params.network_id = 43114
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
    let wavaxContract = new ethers.Contract(WAVAX, wavaxABI, SIGNER)
    let txWrap = await wavaxContract.deposit({ value: amount })
    let txApprove = await wavaxContract.approve(ZERO_ROUTER, amount)
    return Promise.all([
        PROVIDER.waitForTransaction(txWrap.hash),
        PROVIDER.waitForTransaction(txApprove.hash)
    ])
}

async function dummyTradeTokensToTokens(path, tradeAmount) {
    let dexContract = new ethers.Contract(
        ZERO_ROUTER, 
        uniswapABI, 
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
        ZERO_ROUTER, 
        uniswapABI, 
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
    
    let testPaths = paths.filter(p=>p.gasAmount==300000) // Only run instructions that still have default gas amount value
    SIGNER = PROVIDER.getSigner(testAccount)
    let wrapAmount = ethers.utils.parseEther('999')
    let tradeAmount = ethers.utils.parseEther('1')
    await wrapAvax(wrapAmount).then(()=>console.log('Wrapping finished!'))
    for (let path of testPaths) {
        try {
            let txReceipt = await dummyTradeTokensToTokens(path, tradeAmount)
            let gasUsed = txReceipt.gasUsed.toString()
            updateGasEstimate(path.id, gasUsed)
            console.log(`Gas estimate for ${path.id}: ${gasUsed}`)
            // await sleep(3)
        } catch {
            console.log(`Path ${path.id} failed to execute trade tx!`)
        }
    }
}

tradeWithTestAccount()