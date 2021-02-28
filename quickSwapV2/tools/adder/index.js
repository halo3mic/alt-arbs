const adder = require('./adder')
const csv = require('csvtojson')
const ethers = require('ethers')
const { provider } = require('../../provider')

async function main() {
    // await importPoolsFromCsv()

    let factoryAddress = '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'
    await importPoolsFromFactory(factoryAddress)
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

async function importPoolsFromFactory(address) {
    let poolMng = new adder.PoolManager()
    let factoryAbi = require('../../config/abis/uniswapFactory.json')
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


}

async function approveTkns() {
    let approvalMng = new adder.ApprovalsManager()
    await approvalMng.updateAllApprovals()
    await approvalMng.approveAll()
    return true
}

async function addInstructions() {
    let im = new adder.InstructionManager()
    return await im.findInstructions()
}


// main()
addInstructions()
