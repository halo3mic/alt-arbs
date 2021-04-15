// Modify logs
const deffered = require('deffered')
const crypto = require('crypto')
const csv = require('fast-csv')
var fs = require('fs')

const { provider } = require('../../provider').ws

var indexCount = {}

async function generateUpdateIDVersionMap() {
    let src = './avalanche/tools/data/dst/update.csv'
    let df = new deffered()
    let updateIdVersionMap = {}
    fs.createReadStream(src)
    .pipe(csv.parse({ headers: true }))
    .on('error', (error) => {df.resolve({status: 0, error})})
    .on('end', () => {df.resolve({status: 1, result: updateIdVersionMap})})
    .on('data', function(row) {
        let oldUpdateId = generateOldUpdateId(row.blockNumber, row.updatedPools)
        updateIdVersionMap[oldUpdateId] = updateIdVersionMap[oldUpdateId] || []
        updateIdVersionMap[oldUpdateId].push({ 
            poolAddress: row.updatedPools,
            updateId: row.updateId
        })
      }
    )
    return df.promise
}

function generateOppId(pathId, updateId) {
    let uniqueIndentifier = updateId + pathId
    let id = crypto.createHash('md5').update(uniqueIndentifier).digest('hex')
    return id
}

function generateUpdateId(blockNumber, poolAddress, index, nodeIp, traderAddress) {
    let uniqueIndentifier = `${blockNumber}${poolAddress}${index}${nodeIp}${traderAddress}`
    let id = crypto.createHash('md5').update(uniqueIndentifier).digest('hex')
    return id
}

function generateOldUpdateId(blockNumber, poolAddress) {
    let id = `${blockNumber}P${crypto.createHash('md5').update(poolAddress).digest('hex')}`
    return id
}

async function filterRows(src, dst, callback) {
    let df = new deffered()
    let rowCount = 0
    fs.createReadStream(src)
    .pipe(csv.parse({ headers: true }))
    .on('error', (error) => {df.resolve(console.log(error))})
    .on('end', () => {df.resolve({status: 1, rowCount})})
    .on('data', function(row) {
      row = callback(row)
      if (row) {
          let writableStream = fs.createWriteStream(dst, {flags: 'a'})
          writableStream.write('\n')
          csv.writeToStream(writableStream, [row], { headers: false })
          rowCount ++
        }
      }
    )
    return df.promise
  }

async function transformUpdates() {
    console.log('Transforming updates ...')
    let src = './avalanche/tools/data/src/update.csv'
    let dst = './avalanche/tools/data/dst/update.csv'
    await filterRows(src, dst, row => {
        // Skip if: traderAddress is 0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab
        if (row.traderAddress=='0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab') {
            return
        }
        // Previous version didn't log id so differente between them with 
        // tracking rows per block number
        // Note that this method allows repeatble events (for updates that shouldn't be too big of an issue)
        row.index = indexCount[row.blockNumber] || 0
        indexCount[row.blockNumber] = row.index + 1
        // Update to the new version of id
        row.updateId = generateUpdateId( 
            row.blockNumber, 
            row.updatedPools, 
            row.index, 
            row.nodeIp, 
            row.traderAddress
        )
        return row
    })
    console.log('Finished')
}

async function transformOpportunities() {
    console.log('Transforming opportunities ...')
    let src = './avalanche/tools/data/src/opps.csv'
    let dst = './avalanche/tools/data/dst/opps.csv'
    let paths = require('../../config/paths.json')
    let pools = require('../../config/pools.json')
    var {result: updateIdVersionMap, error} = await generateUpdateIDVersionMap()
    if (error) {
        throw error
    }
    await filterRows(src, dst, async row => {
        // Skip if: traderAddress is 0x8A877D7f4D7DBDebFf196C93Cc34BABF6A90f9ab
        if (row.internalError=='VM Exception while processing transaction: revert Not profitable') {
            return
        }
        let pathPools = paths.filter(p=>p.id==row.pathId)[0].pools
        if (!updateIdVersionMap[row.updateId]) {
            return
        }
        if (row.txHash) {
            try {
                let tx = await provider.getTransaction(row.txHash)
                if (!tx) {
                    console.log('unknow tx')
                    return
                }
            } catch (e) {
                console.log(e)
                return
            }
        }
        for (let ver of updateIdVersionMap[row.updateId]) {
            let poolId = pools.filter(p=>p.address==ver.poolAddress)[0].id
            if (pathPools.includes(poolId)) {
                row.updateId = ver.updateId
                break
            }
        }
        row.oppId = generateOppId(row.pathId, row.updateId)
        return row
    })
    console.log('Finished')
}

async function main() {
    // await transformUpdates()
    await transformOpportunities()
}

main()