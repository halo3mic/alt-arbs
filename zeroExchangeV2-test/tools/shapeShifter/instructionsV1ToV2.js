// Convert instructions, pools and tokens from v1 version to v2
// v1 docs should be in csv and in r1
// v2 docs should be in json and in r2
const csv = require('csvtojson')
const fs = require('fs')

function saveJson(content, path) {
    let data = JSON.stringify(content, null, 4);
    fs.writeFileSync(path, data);
    console.log(`File saved at ${path}`)
}

// Instructions
async function convertInstructions() {
    const sourcePath = `${__dirname}/v1/instructions.csv`
    const targetPath = `${__dirname}/v2/instructions.json`
    const instructions = await csv().fromFile(sourcePath)
    instructions.forEach(instr => {
        instr.tkns = instr.path.split(',').map(e => e.trim())
        instr.pools = [instr.pool1, instr.pool2]
        instr.gasAmountArcher = (parseInt(instr.gasAmountArcher)+10000).toString()
        delete instr.path
        delete instr.pool1
        delete instr.pool2
    })
    console.log(instructions[1])
    saveJson(instructions, targetPath)
}

// Pools
async function convertPools() {
    const sourcePath = `${__dirname}/v1/pools.csv`
    const targetPath = `${__dirname}/v2/pools.json`
    const pools = await csv().fromFile(sourcePath)
    pools.forEach(pool => {
        pool.tkns = pool.tokens.split(',').map(e => {
            return {
                id: e.trim(), 
                weight: 0.5
            }
        })
        delete pool.tokens
    })
    console.log(pools[1])
    saveJson(pools, targetPath)
}

// Tokens
async function convertTokens() {
    const sourcePath = `${__dirname}/v1/tokens.csv`
    const targetPathTokens = `${__dirname}/v2/tokens.json`
    const targetPathApprovals = `${__dirname}/v2/tokenApprovals.json`
    const tokens = await csv().fromFile(sourcePath)
    const tokenApprovals = tokens.map(tkn => {
        return {
            id: tkn.id, 
            approved: tkn.approved, 
            required: tkn.requiredApproval
        } 

    })
    tokens.forEach(tkn => {
        delete tkn.approved
        delete tkn.requiredApproval

    })
    console.log(tokens[1])
    console.log(tokenApprovals[1])
    saveJson(tokens, targetPathTokens)
    saveJson(tokenApprovals, targetPathApprovals)
}

convertInstructions()
convertPools()
convertTokens()
