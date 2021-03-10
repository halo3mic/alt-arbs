const tokens = require('../../config/tokens.json')
const paths = require('../../config/paths.json')
const provider = require('../../provider')
const config = require('../../config')
const ethers = require('ethers')
const path = require('path')
const fs = require('fs')

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
        t => t.id==config.BASE_ASSET
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

async function simulatePastOpp(blockNumber, makeTradeArgs) {
    PROVIDER = connectToGancheProvider({fork: `${provider.ws.endpoint}@${blockNumber}`})
    let testAccount = fetchTestAccount()
    SIGNER = PROVIDER.getSigner(testAccount)

    let dispatcher = new ethers.Contract(
        config.DISPATCHER, 
        config.ABIS['dispatcher'], 
        SIGNER
    )
    let tx = dispatcher.makeTrade(...makeTradeArgs)
    console.log(tx)
}

async function simulateOppN1() {
    let tradeTxBytes ='d9e1ce17f2641f24ae83637ab66a2cca9c378b9f00000000000000000000000000000000000000000000000000000000000000e47ff36ab5000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d00000000000000000000000000000000000000000000000000000000604238d70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000d46ba6d942050d489dbd938a2c909a5d5039a161d9e1ce17f2641f24ae83637ab66a2cca9c378b9f000000000000000000000000000000000000000000000000000000000000010438ed17390000000000000000000000000000000000000000000000000000001676e8e3e4000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d00000000000000000000000000000000000000000000000000000000604238d70000000000000000000000000000000000000000000000000000000000000002000000000000000000000000d46ba6d942050d489dbd938a2c909a5d5039a1610000000000000000000000006b3595068778dd592e39a122f4f5a5cf09c90fe27a250d5630b4cf539739df2c5dacb4c659f2488d000000000000000000000000000000000000000000000000000000000000010418cbafe50000000000000000000000000000000000000000000000005fa0bb36248d806f000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000d30ce37a6f2424593dabe9b712d235781815445d00000000000000000000000000000000000000000000000000000000604238d700000000000000000000000000000000000000000000000000000000000000020000000000000000000000006b3595068778dd592e39a122f4f5a5cf09c90fe2000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    let targetBlock = 11978696
    let inputAmount = ethers.BigNumber.from('57637915546868570')
    let makeTradeArgs = [tradeTxBytes, inputAmount]
    await simulatePastOpp(targetBlock, makeTradeArgs)
}   

estimateGasAmount()
