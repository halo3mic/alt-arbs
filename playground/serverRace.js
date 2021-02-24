const { provider } = require('./avaProvider')

const uniswapSyncTopic = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'  // Sync(uint112 reserve0, uint112 reserve1)
const RESULTS = {}

async function main() {
    listenForEvents()
    listenForBlocks()
    handleResults()
}

function listenForEvents() {
    const filter = {topics: [uniswapSyncTopic]}
    provider.on(filter, log => {
        let timestamp = process.hrtime()  // Note: this is not epoch time
        if (!RESULTS[log.blockNumber]) {
            RESULTS[log.blockNumber] = []
        }
        RESULTS[log.blockNumber].push({
            method: 'events', 
            timestamp
        })
    })
}

function listenForBlocks() {
    const filter = {topics: [uniswapSyncTopic]}
    let timestamp = process.hrtime()  // Note: this is not epoch time
    provider.on('block', blockNumber => {
        if (!RESULTS[blockNumber]) {
            RESULTS[blockNumber] = []
        }
        RESULTS[blockNumber].push({
            method: 'blocks', 
            timestamp  
        })
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
            wins = {
                'events': 0, 
                'blocks': 0
            }
            Object.values(RESULTS).forEach(result => {
                if (Object.keys(result).length==2) {
                    rounds ++
                    let winner = result.reduce(function(prev, current) {
                        return (prev.timestamp > current.timestamp) ? current : prev
                    })
                    wins[winner.method] += 1
                }
            })
            if (rounds>0) {
                // Display the analysis
                console.log('\033[2J')
                console.log('^'.repeat(50))
                console.log(`Event wins: ${((wins['events'])/rounds*100).toFixed(0)}%`)
                console.log(`Blocks wins: ${((wins['blocks'])/rounds*100).toFixed(0)}%`)
                console.log(`Number of rounds: ${rounds}`)
                console.log('^'.repeat(50))
            }
        }
        await sleep(breakDuration)
    }
}

main()