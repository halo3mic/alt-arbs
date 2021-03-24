const providers = require('../provider')
const ethers = require('ethers')
const config = require('../config')


async function accountBalanceAtBlock(blockNumber, accountAddress) {
    let fork = providers.ws.endpoint + '@' + blockNumber.toString()
    let forkProvider = providers.setGanacheProvider({fork})
    let avaxBal = await forkProvider.getBalance(accountAddress)
    let wavaxAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
    let wavaxContract = new ethers.Contract(wavaxAddress, config.ABIS['erc20'], forkProvider)
    let wavaxBal = await wavaxContract.balanceOf(accountAddress)
    let bals = { wavaxBal, avaxBal }

    return bals
}

async function getWrappedBalance() {
   return await WRAPPED_CONTRACT.balanceOf(SIGNER.address)
}

async function getBalance1() {
    let forkBlockNumber = 657582
    let accountAddress = '0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab'
    let {wavaxBal, avaxBal} = await accountBalanceAtBlock(forkBlockNumber, accountAddress)
    let formattedBalAvax = parseFloat(ethers.utils.formatEther(avaxBal)).toFixed(2)
    let formattedBalWavax = parseFloat(ethers.utils.formatEther(wavaxBal)).toFixed(2)
    console.log(`Balance for account ${accountAddress} at block ${forkBlockNumber}: \n${formattedBalAvax} AVAX & ${formattedBalWavax} WAVAX`)
}

async function getAddressLogs() {
    let address = '0x103c7BEC38a948b738A430B2b685654dd95bE0A5'
    let logs = await provider.getLogs({ address: null, topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    ]})
    console.log(logs)
}

async function deployHelper() {
    let bytecode = '0x608060405234801561001057600080fd5b506102f9806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80637789c3f814610030575b600080fd5b6101106004803603606081101561004657600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291908035906020019064010000000081111561008d57600080fd5b82018360208201111561009f57600080fd5b803590602001918460208302840111640100000000831117156100c157600080fd5b919080806020026020016040519081016040528093929190818152602001838360200280828437600081840152601f19601f820116905080830192505050505050509192919290505050610126565b6040518082815260200191505060405180910390f35b6000808490508073ffffffffffffffffffffffffffffffffffffffff1663d06ca61f85856040518363ffffffff1660e01b81526004018083815260200180602001828103825283818151815260200191508051906020019060200280838360005b838110156101a2578082015181840152602081019050610187565b50505050905001935050505060006040518083038186803b1580156101c657600080fd5b505afa92505050801561029457506040513d6000823e3d601f19601f8201168201806040525060208110156101fa57600080fd5b810190808051604051939291908464010000000082111561021a57600080fd5b8382019150602082018581111561023057600080fd5b825186602082028301116401000000008211171561024d57600080fd5b8083526020830192505050908051906020019060200280838360005b83811015610284578082015181840152602081019050610269565b5050505090500160405250505060015b6102a25760009150506102bc565b806001815181106102af57fe5b6020026020010151925050505b939250505056fea26469706673582212208546a53aae5f9e118484d705df77912087c3dfa44cadebc860a3d510a677ab6864736f6c63430007060033'
    let signer = providers.ws.signer
    let txPayload = {
        from: signer.address, 
        data: bytecode, 
        // gasLimit: 300000
    }
    await signer.estimateGas(txPayload).catch(e => {
        console.log('There was an error deploying the contract')
        console.log(e)
        return
    })
    let tx = await signer.sendTransaction(txPayload)
    let txReceipt = await providers.ws.provider.waitForTransaction(tx.hash)
    console.log(txReceipt)
}

async function callQueryContract() {
    let queryContractAddress = '0xF9eCB1b756Da68F60acBc33A436F631A7155bB96'
    let router = '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106'  // Pangolin
    let fromToken = '0xf20d962a6c8f70c731bd838a3a388D7d48fA6e15'
    let toToken = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
    let amountIn = ethers.utils.parseUnits('1')
    let queryContract = new ethers.Contract(
        queryContractAddress, 
        config.ABIS['unishRouterProxy'],
        providers.ws.provider
    )
    let outputAmount = await queryContract.getOutputAmount(
        router, 
        amountIn, 
        [
            fromToken, 
            toToken
        ]
    )
    console.log(outputAmount)
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 

async function race() {
    let wavaxAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'
    let wavaxContract = new ethers.Contract(
        wavaxAddress, 
        config.ABIS['weth'], 
        providers.ws.signer
    )
    let amount = ethers.utils.parseUnits('0.1')
    let gasLimit = 1e5
    let gasPrice1 = ethers.utils.parseUnits('470', 'gwei')
    let gasPrice2 = gasPrice1.add(ethers.utils.parseUnits('22', 'wei'))
    let nonce = await providers.ws.signer.getTransactionCount()
    // First send unwrap tx with low gas
    wavaxContract.withdraw(amount, {
        gasPrice: gasPrice1,
        gasLimit,
        nonce: nonce+1,
    }).then(tx => {
        console.log('Withdraw')
        console.log(tx)
    })
    await sleep(3000)
    // Then send wrap tx with high gas
    wavaxContract.deposit({
        gasPrice: gasPrice2, 
        value: amount,
        gasLimit,
        nonce: nonce,
    }).then(tx => {
        console.log('Deposit')
        console.log(tx)
    })
}

race()
