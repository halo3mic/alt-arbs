const instructionsRaw = require('../../config/instructions.json')
const poolsRaw = require('../../config/pools.json')
const tokensRaw = require('../../config/tokens.json')

function addId(array) {
    return Object.fromEntries(array.map(element => [element.id, element]))
}

module.exports = {
    instructions: addId(instructionsRaw), 
    pools: addId(poolsRaw), 
    tokens: addId(tokensRaw)
}
