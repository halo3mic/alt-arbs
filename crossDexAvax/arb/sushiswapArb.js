const { ABIS, ROUTERS } = require('../config')
const ethers = require('ethers')

let PROVIDER

function initialize(provider) {
    PROVIDER = provider
}



async function handleNewBlock() {
    // const accounts = await ethers.provider.listAccounts()
    // const signer = ethers.provider.getSigner(accounts[0])
    const router = new ethers.Contract(
        ROUTERS.SUSHISWAP_ROUTER,
        ABIS['uniswapRouter'],
        PROVIDER
    );
    let path = [
        ethers.utils.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"), // weth
        ethers.utils.getAddress("0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e"), // yfi
        ethers.utils.getAddress("0x3155ba85d5f96b2d030a4966af206230e46849cb"), // rune
        ethers.utils.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"), // weth
    ];

    let amounts = [
        ethers.utils.parseUnits("1"),
        ethers.utils.parseUnits("2"),
        ethers.utils.parseUnits("5"),
        ethers.utils.parseUnits("10"),
        ethers.utils.parseUnits("20"),
        ethers.utils.parseUnits("50"),
    ];
    let bestProfit = 0
    for (amountIn of amounts) {
        let amounts = await router.getAmountsOut(amountIn, path);
        let profit = amounts[amounts.length - 1].sub(amounts[0]);
        console.log(
            ethers.utils.formatUnits(amountIn),
            ethers.utils.formatUnits(profit),
        );
        if (profit.gt(bestProfit)) {
            bestProfit = profit
            // let deadline = Date.now() + 180;
            // await router.swapExactETHForTokens(amounts[amounts.length - 1], path, accounts[0], deadline, { value: amountIn });
        }
    }
    console.log('Best profit for: ', bestProfit)
}

module.exports = { initialize, handleNewBlock }