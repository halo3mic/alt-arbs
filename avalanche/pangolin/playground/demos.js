const txMng = require('../txManager')
const providers = require('../provider')
const { provider, signer } = providers.ws


async function formDispatcherTxWithQuery() {
    let blockNumber = 712219
    let forkProvider = providers.setGanacheProvider({
        fork: `${providers.ws.endpoint}@${blockNumber}`, 
        unlocked_accounts: [signer.address]
    })
    let forkSigner = forkProvider.getSigner(signer.address)
    let inputAmount = '0x41b68853d79bf88c'
    let queryTx = {
        calldata: '0xf9ecb1b756da68f60acbc33a436f631a7155bb9600000000000000000000000000000000000000000000000000000000000001247789c3f8000000000000000000000000e54ca86531e17ef3616d22ca28b0d458b6c8910600000000000000000000000000000000000000000000000041b68853d79bf88c00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000005000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7000000000000000000000000b3fe5374f67d7a22886a0ee082b2e2f9d265165100000000000000000000000060781c2586d68229fde47564546784ab3faca98200000000000000000000000039cf1bd5f15fb22ec3d9ff86b0727afc203427cc000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7',
        inputLocations: []
    }
    let tradeTx = {
        calldata: '0xe54ca86531e17ef3616d22ca28b0d458b6c891060000000000000000000000000000000000000000000000000000000000000144a2a1623d00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000d11828308fc7c84ea31ccd398e609468d6d207130000000000000000000000000000000000000000000000000000000060582db00000000000000000000000000000000000000000000000000000000000000005000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7000000000000000000000000b3fe5374f67d7a22886a0ee082b2e2f9d265165100000000000000000000000060781c2586d68229fde47564546784ab3faca98200000000000000000000000039cf1bd5f15fb22ec3d9ff86b0727afc203427cc000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7b31f66aa3c1e785363f0875a1b74e27b85fd66c700000000000000000000000000000000000000000000000000000000000000242e1a7d4d00000000000000000000000000000000000000000000000041e3f7e43c6a86b8',
        inputLocations: []
    }
    txMng.init(provider, signer)
    let txPayload = await txMng.formDispatcherTxWithQuery(
        inputAmount, 
        queryTx,
        tradeTx
    )
    // let txPayload = await txMng.formDispatcherTx(
    //     inputAmount, 
    //     tradeTx
    // )
    let arbTx = await forkSigner.sendTransaction(txPayload).catch(e => {
        console.log(e)
        process.exit(0)
    })
    let arbTxReceipt = await forkProvider.waitForTransaction(arbTx.hash)
    console.log(arbTxReceipt)
}

formDispatcherTxWithQuery()