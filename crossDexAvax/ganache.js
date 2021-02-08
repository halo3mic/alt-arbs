const { connectToGancheProvider, provider } = require('./provider')
const { ABIS, ROUTERS, WETH_ADDRESS } = require('./config')
const ethers = require('ethers')
const BigNumber = ethers.BigNumber


async function sushiMintUsdc(provider, target, token) {
    // Next step would be to also specify the amount of tokens
    const bank = '0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e'  // Random address
    await unlockAddresses(provider, bank)
    const signerWeth = provider.getSigner(bank)
    const sushiContract = new ethers.Contract(ROUTERS.SUSHISWAP_ROUTER, ABIS['uniswapRouter'], signerWeth)
    const tokenContract = new ethers.Contract(token, ABIS['erc20'], signerWeth)
    const tx = await sushiContract.populateTransaction.swapExactETHForTokens(
        0, 
        [WETH_ADDRESS, token], 
        target, 
        ((Date.now()/1000)+300).toFixed(0)
    )
    tx.value = ethers.utils.parseEther('1000')
    await signerWeth.sendTransaction(tx)
    return await tokenContract.balanceOf(target)
}

async function getErc20Decimals(provider, token) {
    // Could just query the local db
    return await provider.call({
        data: '0x313ce567',
        to: token
    })
}

async function getErc20Balance(provider, token, holder, convert) {
    let balance = await provider.call({
        data: '0x70a08231000000000000000000000000' + holder.replace('0x', ''),
        to: token
    }).then(b => {
        // console.log(b)
        return BigNumber.from(b)}
    )
    if (convert) {
        dec = await getErc20Decimals(provider, token)
        balance = parseFloat(ethers.utils.formatUnits(balance, dec))
    }
    return balance
}

async function approveErc20(signer, token, spender, amount) {
    const amountHex = amount ? amount.toString(16).replace('0x', '') : 'f'.repeat(64)
    const calldata = `0x095ea7b3000000000000000000000000${spender.replace('0x', '')}${amountHex}`
    return signer.sendTransaction({
        to: token, 
        data: calldata
    })
}

async function allowanceErc20(provider, token, owner, spender, convert) {
    let allowed = await provider.call({
        data: `0xdd62ed3e000000000000000000000000${owner.replace('0x', '')}000000000000000000000000${spender.replace('0x', '')}`,
        to: token
    }).then(b => parseInt(b, 16))
    if (convert) {
        dec = await getErc20Decimals(provider, token)
        allowed /= 10**dec
    }
    return allowed
}

async function unlockAddresses(provider, ...addresses) {
    return await provider.send('evm_unlockUnknownAccount', [...addresses])
}

async function advanceBlock(provider, times) {
    if (times==1) {
        return await provider.send('evm_mine')
    }
    await provider.send('evm_mine')
    return advanceBlock(provider, times-1)
}

module.exports = { advanceBlock, sushiMintUsdc, getErc20Balance, approveErc20, allowanceErc20 }