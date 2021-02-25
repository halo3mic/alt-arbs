const { provider } = require('./avaProvider')

const uniswapSyncTopic = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'  // Sync(uint112 reserve0, uint112 reserve1)
const RESULTS = {}
const hrstart = process.hrtime()

async function main() {
    listenForEvents()
    listenForBlocks()
    handleResults()
}

function listenForEvents() {
    const filter = {topics: [uniswapSyncTopic]}
    provider.on(filter, log => {
        let blockNumber = log.blockNumber
        let timestamp = process.hrtime(hrstart)[1]  // Note: this is not epoch time - in ns
        if (!RESULTS[blockNumber]) {
            RESULTS[blockNumber] = {}
        }
        RESULTS[blockNumber]['events'] = timestamp
    })
}

function listenForBlocks() {
    provider.on('block', blockNumber => {
        let timestamp = process.hrtime(hrstart)[1]  // Note: this is not epoch time - in ns
        if (!RESULTS[blockNumber]) {
            RESULTS[blockNumber] = {}
        }
        RESULTS[blockNumber]['blocks'] = timestamp
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleResults() {
    let breakDuration = 1000  // In ms
    let resultCount = 0
    while (1) {
        let rounds = 0
        let newResultCount = Object.keys(RESULTS).length
        // If new result detected analyse the results
        if (newResultCount > resultCount) {
            resultCount = newResultCount
            let wins = {
                'events': 0, 
                'blocks': 0
            }
            let diffsCum = 0
            Object.values(RESULTS).forEach(result => {
                if (Object.keys(result).length==2) {
                    rounds ++
                    if (result['events']>result['blocks']) {
                        wins['blocks'] += 1
                    } else {
                        wins['events'] += 1
                    }
                    diffsCum += result['blocks'] - result['events']
                }
            })
            if (rounds>0) {
                let avgDiff = diffsCum / rounds
                // Display the analysis
                console.log('\033[2J')  // Clear the terminal
                console.log('^'.repeat(50))
                console.log(`Event wins: ${((wins['events'])/rounds*100).toFixed(0)}%`)
                console.log(`Blocks wins: ${((wins['blocks'])/rounds*100).toFixed(0)}%`)
                console.log(`Number of rounds: ${rounds}`)
                console.log(`Events faster than blocks by avg of: ${(avgDiff/1e6).toFixed(2)} ms`)
                console.log('^'.repeat(50))
            }
        }
        await sleep(breakDuration)
    }
}

main()