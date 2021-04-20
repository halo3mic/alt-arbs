const { ethers } = require('ethers')
const { provider, signer, endpoint } = require('../../provider').ws
const { logToCsv } = require('../../utils')

const X = 1
const txs = 50
const START_BLOCK = 1163350

const SUBMISSION_TIMEOUT = 2*1000
const NODE_IP = endpoint.match('\(?<=\/\/)(.*?)(?=\:)')[0]
const testAccount = '0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab'
let LAST_BLOCK = 0
let NONCE

async function init() {
    NONCE = await signer.getTransactionCount()-1
    startListener()
}

function startListener() {
    if (signer.address!=testAccount) {
        throw new Error('Not a test account')
    }
    provider.on('block', async blockNumber => {
        let triggerTimestamp = Date.now()
        if (blockNumber>LAST_BLOCK) {
            LAST_BLOCK = blockNumber
            console.log('New block:', blockNumber, '| Nonce:', NONCE)
            console.log(await signer.getTransactionCount()-1)
            if (blockNumber-START_BLOCK>X*txs) {
                console.log('Removing all listeners')
                provider.removeAllListeners()
            }
            if (blockNumber > START_BLOCK && blockNumber%X==0) {
                console.log('Sending selfie')
                let tx, error, submitTimestamp, receipt
                try {
                    tx = await sendSelfie()
                    submitTimestamp = Date.now()
                    receipt = await Promise.race([
                        provider.waitForTransaction(tx.hash),
                        new Promise(function(resolve, reject) {
                            setTimeout(() => resolve({}), SUBMISSION_TIMEOUT);
                        })
                    ])
                } catch (e) {
                    console.log(e.code)
                    error = e.code
                    receipt = receipt || {}
                    tx = tx || {}
                } finally {
                    logToCsv('./avalanche/tools/racer/race_data.csv', {
                        nodeIp: NODE_IP,
                        txHash: tx.hash,
                        triggerBlock: blockNumber,
                        submitBlock: receipt.blockNumber,
                        txIndex: receipt.transactionIndex,
                        triggerTimestamp, 
                        submitTimestamp, 
                        error
                    })
                    console.log('Results saved')
                }
            }
        }
    })
}

async function sendSelfie() {
    NONCE ++
    return signer.sendTransaction({
        to: signer.address, 
        gasPrice: ethers.utils.parseUnits('225', 'gwei'), 
        gasLimit: 25000, 
        nonce: NONCE
    })
}

init()