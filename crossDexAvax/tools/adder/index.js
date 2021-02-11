const adder = require('./adder')
const csv = require('csvtojson')
const ethers = require('ethers')
const { provider } = require('../../provider')

async function main() {
    let factories = [
        '0xefa94DE7a4656D787667C749f7E1223D71E9FD88', 
        '0xeb4E120069d7AaaeC91508eF7EAec8452893a80a',
        '0x29D1Adbb65d93a5710cafe2EF0E8131f64E6AB22', 
        '0x2Ef422F30cdb7c5F1f7267AB5CF567A88974b308'
    ]
    // await importPoolsFromCsv()
    // await importPoolsFromFactory(...factories)
    // await approveTkns()
    // await addInstructions()
}


async function importPoolsFromCsv() {
    // Import all pools from add.csv and convert this file to json
    const sourcePath = `${__dirname}/add.csv`
    const addRequests = await csv().fromFile(sourcePath)
    // Add new pools
    let poolMng = new adder.PoolManager()
    return addRequests.map(r => poolMng.add(r.poolAddress))
}

async function importPoolsFromFactory(...addresses) {
    let poolMng = new adder.PoolManager()
    let factoryAbi = require('../../config/abis/uniswapFactory.json')
    addresses.forEach(async address => {
        let factoryContract = new ethers.Contract(address, factoryAbi, provider)
        let max = await factoryContract.allPairsLength().then(l=>l.toNumber())
        let i = 0
        while (i<max) {
            try {
                let a = await factoryContract.allPairs(i)
                poolMng.add(a)
                i ++
            } catch (e) {
                console.log(e)
                break
            }
        }
    })


}

async function approveTkns() {
    let approvalMng = new adder.ApprovalsManager()
    // await approvalMng.updateAllApprovals()
    await approvalMng.approveAll()
    return true
}

async function addInstructions() {
    let im = new adder.InstructionManager()
    return await im.findInstructions()
}

main()
// addInstructions()
// approveTkns()