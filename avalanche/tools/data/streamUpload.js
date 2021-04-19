// Import the Google Cloud client library
const {BigQuery} = require('@google-cloud/bigquery');
const { provider } = require('../../provider').http
const ethers = require('ethers')

const bigquery = new BigQuery();

async function query(queryScript) {
    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
      query: queryScript,
      location: 'US',
    };
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();
    return rows
}

async function getTxData(txHash) {
    let receipt = await provider.getTransactionReceipt(txHash)
    let profit = receipt.status==1 ? getProfit(receipt) : ethers.constants.Zero
    let data = {
        txHash: receipt.transactionHash, 
        from: receipt.from, 
        to: receipt.to, 
        blockNumber: receipt.blockNumber, 
        status: receipt.status, 
        gasUsed: receipt.gasUsed.toString(), 
        profit: profit.toString()
    }
    return data
}

function getProfit(receipt) {
    let amountIn = ethers.BigNumber.from(
        receipt.logs.filter(log => 
            log.topics.includes('0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c')  // Deposit
        )[0].data
    )
    let amountOut = ethers.BigNumber.from(
        receipt.logs.filter(log => 
            log.topics.includes('0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65')  // Withdraw
        )[0].data
    )
    return amountOut.sub(amountIn)
}

async function main() {
    console.log('Querying BQ for tx hashes associated with opps')
    let oppHashQuery = `
        SELECT txHash 
        FROM \`avalanche-304119.avalanche_bot_v0.opportunities\`
        WHERE txHash IS NOT NULL
    `
    let oppHashes = await query(oppHashQuery).then( result => {
        return result.map(r => r.txHash)
    })
    console.log('Querying BQ for tx hashes already in the table')
    let includedHashQuery = `
        SELECT txHash 
        FROM \`avalanche-304119.avalanche_bot_v0.trades\`
    `
    let results = await query(includedHashQuery)
    let includedHashes = results.map(r => r.txHash)
    let neededTxs = oppHashes.filter(hash => !includedHashes.includes(hash))  // Skip if hash is already in the table
    console.log(neededTxs.length, ' trades needs to be uploaded')
    let maxRows = 10
    let chunks = Math.ceil(neededTxs.length / maxRows)
    for (let i=0; i<chunks; i++) {
        let rows = []
        console.log('Fetching chain data assocatiated with opps')
        for (let hash of neededTxs.slice(i*maxRows, (i+1)*maxRows)) {
            console.log(hash)
            let data = await getTxData(hash)
            rows.push(data)
        }
        console.log('Pushing data to BQ')
        await bigquery
        .dataset('avalanche_bot_v0')
        .table('trades')
        .insert(rows);
        console.log('Job completed')
    }
}

// insertRowsAsStream();
main()