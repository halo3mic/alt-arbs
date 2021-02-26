const rm = require('../reservesManager')
const paths = require('../config/paths.json')
const pools = require('../config/pools.json')
const { provider, startGanacheProvider } = require('../avaProvider')
const ethers = require('ethers')


async function init() {
    await rm.init(provider, paths)
    console.log(rm.getAllReserves())
}

async function updateReserves() {
    let address = '0x9EE0a4E21bd333a6bb2ab298194320b8DaA26516'
    let reservesBytes = '0x000000000000000000000000000000000000000000004a6e7e463389f924984900000000000000000000000000000000000000000000000000000cb3c69676cf'
    let pool= pools.filter(p=>p.address==address)[0]
    console.log(pool.id)
    const forkBlock = '258036'
    let gp = startGanacheProvider(forkBlock)

    await rm.init(gp, paths)
    console.log(`Initial reserves for pool ${address}:`)
    let rOriginal = rm.getReserves([pool.id])
    console.log(rOriginal)

    console.log(`Reserves for pool ${address} after the update:`)
    rm.updateReserves(address, reservesBytes)
    let rNew = rm.getReserves([pool.id])
    console.log(rNew)
    let diffTkn0 = rNew[pool.id][pool.tkns[0].id].sub(
        rOriginal[pool.id][pool.tkns[0].id]
    )
    let diffTkn1 = rNew[pool.id][pool.tkns[1].id].sub(
        rOriginal[pool.id][pool.tkns[1].id]
    )
    console.log('Change in tkn1: ', ethers.utils.formatEther(diffTkn0))
    console.log('Change in tkn2: ', ethers.utils.formatEther(diffTkn1))
}

async function getReserves() {
    let pools = ['P0003', 'P0001', 'P0002']
    await rm.init(provider, paths)
    console.log(rm.getReserves(pools))
}

updateReserves()