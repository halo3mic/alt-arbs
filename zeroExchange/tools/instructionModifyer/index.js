
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

changeArcherGas()