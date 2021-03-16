const { provider } = require('../../provider').ws
const config = require('../../config')
const ethers = require('ethers')
const adder = require('./adder')
const csv = require('csvtojson')

const FLAGS = {
    'import-csv': importPoolsFromCsv, 
    'import-factory': importPoolsFromFactory, 
    'approve': approveTkns, 
    'paths': generatePaths
}

async function main() {
    let flags = process.argv.slice(2)
    flags.forEach(f=>FLAGS[f]())
}

async function importPoolsFromCsv() {
    console.log('Importing pools from csv ...')
    const sourcePath = `${__dirname}/add.csv`
    const addRequests = await csv().fromFile(sourcePath)
    let poolMng = new adder.PoolManager()
    return Promise.all(
        addRequests.map(async r => poolMng.add(r.poolAddress))
    )
}

async function importPoolsFromFactory() {
    console.log('Importing pools from factory ...')
    let poolMng = new adder.PoolManager()
    let factoryContract = new ethers.Contract(
        config.FACTORY, 
        config.ABIS['uniswapFactory'], 
        provider
    )
    let max = await factoryContract.allPairsLength().then(l=>l.toNumber())
    for (let i=0; i<max; i++) {
        try {
            let a = await factoryContract.allPairs(i)
            poolMng.add(a)
        } catch (e) {
            console.log(e)
            break
        }
    }
    return true
}

async function approveTkns() {
    console.log('Approving tokens ...')
    let approvalMng = new adder.ApprovalsManager()
    await approvalMng.updateAllApprovals()
    await approvalMng.approveAll()
    return true
}

async function generatePaths() {
    console.log('Generating paths ...')
    let im = new adder.InstructionManager()
    return im.findInstructions()
}

main()
