const arbbot = require('../arbbot')
const paths = require('../config/paths.json')
const { provider, startGanacheProvider } = require('../avaProvider')


async function arbForPool() {
    const poolAddress = '0x1aCf1583bEBdCA21C8025E172D8E8f2817343d65'

    await arbbot.init(provider)
    arbbot.checkForArb(poolAddress)
}

async function getReservePath() {
    const path = paths[1]

    await arbbot.init(provider)
    let reservePath = arbbot.getReservePath(path)
    console.log(reservePath)
}

async function arbForPathFork() {
    // const path = paths[8]
    const path = paths.filter(p=>p.id=='I0639')[0]
    const forkBlock = '249782'

    let gp = startGanacheProvider(forkBlock)
    await arbbot.init(gp)
    let t0 = Date.now()
    let response = arbbot.arbForPath(path)
    let t1 = Date.now()
    console.log(t1-t0)
    // console.log(response)
}

async function arbForPoolFork() {
    // const path = paths[8]
    const poolAddress = '0x9EE0a4E21bd333a6bb2ab298194320b8DaA26516'
    const forkBlock = '258036'

    let gp = startGanacheProvider(forkBlock)
    await arbbot.init(gp)
    let t0 = Date.now()
    let response = arbbot.arbForPool(forkBlock, poolAddress)
    let t1 = Date.now()
    console.log(t1-t0)
    // console.log(response)
}

arbForPoolFork()