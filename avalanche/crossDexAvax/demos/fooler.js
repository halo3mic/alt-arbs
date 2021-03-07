const ethers = require('ethers')

/**
 * Return normalized number
 * @param {ethers.BigNumber} num - Amount
 * @param {ethers.BigNumber} dec - Token decimals
 * @returns {ethers.BigNumber}
 */
function normalizeUnits(num, dec) {
    // Convert everything to 18 units
    return ethers.utils.parseUnits(
        ethers.utils.formatUnits(num.toString(), dec)
    )
}

function main() {
    let num = ethers.BigNumber.from('2000000')
    let dec = ethers.BigNumber.from('6')
    let normalized = normalizeUnits(num, dec)
    console.log(normalized)
}

main()