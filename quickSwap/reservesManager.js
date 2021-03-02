const tokens = require('./config/tokens.json')
const pools = require('./config/pools.json')
const { ABIS } = require('./config')
const ethers = require('ethers')
const { BigNumber } = ethers

let RESERVES
let PROVIDER

async function init(provider, paths) {
    PROVIDER = provider
    RESERVES = await fetchReservesForPaths(paths)
}

/**
 * Update reserves from Sync logs and return token ids indicating the change
 * If ratio between reserve0 and reserve1 decreased return [tkn0, tkn1]
 * If ratio between reserve0 and reserve1 increased return [tkn1, tkn0]
 * If ratio stayed the same return null
 * @param {String} poolAddress
 * @param {String} reservesBytes
 * @param {Array[String]}
 */
function updateReserves(poolAddress, reservesBytes) {
    const pool = pools.filter(p=>p.address==poolAddress)[0]
    const tkn0 = tokens.filter(t=>t.id==pool.tkns[0].id)[0]
    const tkn1 = tokens.filter(t=>t.id==pool.tkns[1].id)[0]
    let r0 = BigNumber.from(reservesBytes.substr(0, 66))
    let r1 = BigNumber.from('0x' + reservesBytes.substr(66))
    r0 = normalizeUnits(r0, tkn0.decimal)
    r1 = normalizeUnits(r1, tkn1.decimal)
    let result = {}
    result[tkn0.id] = r0
    result[tkn1.id] = r1

    if (RESERVES[pool.id][tkn0.id].gt(r0) && RESERVES[pool.id][tkn1.id].lt(r1)) {
        return [tkn1.id, tkn0.id]
    } else if (RESERVES[pool.id][tkn0.id].lt(r0) && RESERVES[pool.id][tkn1.id].gt(r1)) {
        return [tkn0.id, tkn1.id]
    }
}

/**
 * Get reserves for specific pools
 * @param {Array[String]} poolIds
 * @returns {Object}
 */
function getReserves(poolIds) {
    return Object.fromEntries(poolIds.map(pId=>[pId, RESERVES[pId]]))
}

/**
 * Get all reserves
 * @returns {Object}
 */
function getAllReserves() {
    return RESERVES
}

/**
 * Fetch reserves for a pool
 * @param {String} poolAddress
 * @returns {Array}
 */
async function fetchReservesRaw(poolAddress) {
    const poolContract = new ethers.Contract(
        poolAddress, 
        ABIS['uniswapPool'], 
        PROVIDER
    )
    return poolContract.getReserves()
}

/**
 * Return normalized number
 * @param {ethers.BigNumber} num - Amount
 * @param {ethers.BigNumber} dec - Token decimals
 * @returns {ethers.BigNumber}
 */
function normalizeUnits(num, dec) {
    // Convert everything to 18 units
    return ethers.utils.parseUnits(
        ethers.utils.formatUnits(num, dec)
    )
}

/**
 * Return reserve object for a pool 
 * @param {String} pool - Pool object
 * @returns {Promise}
 */
async function fetchReserves(pool) {
    /* Fetch reserves and format them according to the tokens. */
    const reservesRaw = fetchReservesRaw(pool.address)
    const tkn0 = tokens.filter(t=>t.id==pool.tkns[0].id)[0]
    const tkn1 = tokens.filter(t=>t.id==pool.tkns[1].id)[0]

    let r1 = reservesRaw.then(
            r => normalizeUnits(r[0], tkn0.decimal)
        )
    let r2 = reservesRaw.then(
            r => normalizeUnits(r[1], tkn1.decimal)
        )
    return Promise.all([ r1, r2 ]).then(result => {
        let reserves = {}
        reserves[tkn0.id] = result[0]
        reserves[tkn1.id] = result[1]
        return [pool.id, reserves]
    })
}

/**
 * Fetch and return reserves for paths
 * First prepare data so that no reserve will overlap or be left out
 * @param {Array} paths
 * @returns {Object}
 */
async function fetchReservesForPaths(paths) {
    var reservesPlan = []
    // First prepare data so that no reserve will overlap or be left out
    paths.forEach(instr => {
        instr.pools.forEach(poolId => {
            let poolObj = pools.filter(p=>p.id==poolId)[0]
            if (!reservesPlan.includes(poolObj)) {
                reservesPlan.push(poolObj)
            }
        })
    })
    return Promise.all(reservesPlan.map(fetchReserves)).then(Object.fromEntries)
}


module.exports = { 
    updateReserves,
    getAllReserves, 
    getReserves,
    init, 
}