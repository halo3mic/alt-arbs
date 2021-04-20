const { ethers } = require('ethers')
const { provider, signer, endpoint } = require('../../provider').ws
const { logToCsv } = require('../../utils')

const X = 1
const txs = 50
const START_BLOCK = 1160681

const SUBMISSION_TIMEOUT = 10*1000
const NODE_IP = endpoint.match('\(?<=\/\/)(.*?)(?=\:)')[0]
const testAccount = '0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab'
let LAST_BLOCK = 0

async function sendSelfie() {
    return signer.sendTransaction({
        to: signer.address, 
        gasPrice: ethers.utils.parseUnits('225', 'gwei'), 
        gasLimit: 25000
    })
}

function startListener() {
    if (signer.address!=testAccount) {
        throw new Error('Not a test account')
    }
    provider.on('block', async blockNumber => {
        let triggerTimestamp = Date.now()
        if (blockNumber>LAST_BLOCK) {
            LAST_BLOCK = blockNumber
            console.log('New block:', blockNumber)
            if (blockNumber-START_BLOCK>X*txs) {
                console.log('Removing all listeners')
                provider.removeAllListeners()
            }
            if (blockNumber > START_BLOCK && blockNumber%X==0) {
                console.log('Sending selfie')
                let tx = await sendSelfie()
                let submitTimestamp = Date.now()
                let receipt = await Promise.race([
                    provider.waitForTransaction(tx.hash),
                    new Promise(function(resolve, reject) {
                        setTimeout(() => resolve({}), SUBMISSION_TIMEOUT);
                    })
                ])
                logToCsv('./avalanche/tools/racer/race_data.csv', {
                    nodeIp: NODE_IP,
                    txHash: tx.hash,
                    triggerBlock: blockNumber,
                    submitBlock: receipt.blockNumber,
                    triggerTimestamp, 
                    submitTimestamp
                })
                console.log('Results saved')
            }
        }
    })
}

startListener()