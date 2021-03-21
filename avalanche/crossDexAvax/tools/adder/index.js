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
    console.log(Object.values(config.FACTORIES))
    for (let factoryAddress of Object.values(config.FACTORIES)) {
        let factoryContract = new ethers.Contract(
            factoryAddress, 
            config.ABIS['uniswapFactory'], 
            provider
        )
        try {
            var max = await factoryContract.allPairsLength().then(l=>l.toNumber())
            console.log('Found', max, 'pools')
        } catch (e) {
            console.log(e)
        }
        
        for (let i=0; i<max; i++) {
            try {
                let a = await factoryContract.allPairs(i)
                poolMng.add(a)
            } catch (e) {
                console.log(e)
                break
            }
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
