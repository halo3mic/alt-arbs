const adder = require('./adder')
const csv = require('csvtojson')

async function main() {
    // await importPoolsFromCsv()
    // await approveTkns()
    await addInstructions()
}


async function importPoolsFromCsv() {
    // Import all pools from add.csv and convert this file to json
    const sourcePath = `${__dirname}/add.csv`
    const addRequests = await csv().fromFile(sourcePath)
    // Add new pools
    let poolMng = new adder.PoolManager()
    return addRequests.map(r => poolMng.add(r.poolAddress))
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


main()