
const fs = require('fs')
const resolve = require('path').resolve

function changeArcherGas() {
    let dstInstrPath = resolve(`${__dirname}/../../config/instructions.json`) 
    let srcInstrPath = resolve(`${__dirname}/../../config/instructions.json`) 
    let currData = getCurrentData(srcInstrPath)
    let modified = currData.map(e => {
        e.gasAmountArcher = e.gasAmountArcher.toString()
        return e
    })
    save(modified, dstInstrPath)
}

function disablePathsForPool(poolId) {
    let dstInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
    let srcInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
    let currData = getCurrentData(srcInstrPath)
    let modified = currData.map(p => {
        p.enabled = p.pools.includes(poolId) ? "0" : p.enabled
        return p
    })
    save(modified, dstInstrPath)
}

// function enablePathsForPools(enablePools) {
//     let dstInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
//     let srcInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
//     let currData = getCurrentData(srcInstrPath)
//     let modified = currData.filter(p => {
//         p.pools.map(p1 => {
//             !enablePools.includes(p1)
//         })
//     })
//     save(modified, dstInstrPath)
// }

function disablePathsForToken(tknId) {
    let dstInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
    let srcInstrPath = resolve(`${__dirname}/../../config/paths.json`) 
    let currData = getCurrentData(srcInstrPath)
    let modified = currData.filter(p => !p.tkns.includes(tknId))
    save(modified, dstInstrPath)
}

function getCurrentData(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function save(data, path) {
    try {
        fs.writeFileSync(path, JSON.stringify(data, null, 4))
        return true
    } catch(e) {
        console.log('Couldnt save!')
        console.log(e)
        return 
    }
}

function main() {
    /*
    Disable 
        SFI-WAVAX, 
        SFI-PNG, 
        JOY-WAVAX, 
        WAVAX-1INCH, 
        WBTC-ETH, 
        ETH-zETH, 
        ZERO-PNG, 
        CON-DAS, 
        USDT-ETH
    */
    let poolIds = [
        'P0026',
        'P0029', 
        'P0024',
        'P0020',
        'P0022', 
        'P0021', 
        'P0028', 
        'P0000', 
        'P0002'
    ]
    poolIds.forEach(disablePathsForPool)
}


main()