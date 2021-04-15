const { BigQuery } = require('@google-cloud/bigquery')
const deffered = require('deffered')
const csv = require('fast-csv')
var fs = require('fs')

// Export env var GOOGLE_APPLICATION_CREDENTIALS (See .env)
const bigquery = new BigQuery();

async function _store_temp(src, dst, ids) {
  let df = new deffered()
  let rowCount = 0
  fs.createReadStream(src)
  .pipe(csv.parse({ headers: true }))
  .on('error', (error) => {df.resolve({status: 0, error})})
  .on('end', () => {df.resolve({status: 1, rowCount})})
  .on('data', function(row) {
    // Write only rows that are not yet in ids array
    if (!ids.includes(Object.values(row)[0])) {
        let writableStream = fs.createWriteStream(dst, {flags: 'a'})
        writableStream.write('\n')
        csv.writeToStream(writableStream, [row], { headers: false })
        rowCount ++
      }
    }
  )
  return df.promise
}

async function query(queryScript) {
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: queryScript,
    location: 'US',
  };
  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  console.log(`Job ${job.id} started.`);
  // Wait for the query to finish
  const [rows] = await job.getQueryResults();
  return rows
}

async function uploadFromCsv({ sourceFile, datasetId, tableId, metadata }) {
  // Load data into a table that uses column-based time partitioning.
  // Configure the load job. For full list of options, see:
  // https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
  const [ job ] = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .load(sourceFile, metadata);
  console.log(`Job ${job.id} completed.`);
  const errors = job.status.errors;
  if (errors && errors.length > 0) {
    return { status: 0, errors }
  }
  return { status: 1, errors }
}

async function uploadOpportunities() {
  console.log('\n// OPPORTUNITIES \\\\\n...')
  // let sourceFile = './avalanche/logs/opps.csv'
  // let tempFile = './avalanche/logs/.temp/opps.csv'
  let sourceFile = './avalanche/tools/data/dst/opps.csv'
  let tempFile = './avalanche/tools/data/dst/.tempopps.csv'
  let queryScript = `
    SELECT oppId
    FROM \`avalanche-304119.avalanche_bot_v0.opportunities\`
  `
  console.log('Querying the chain for uploded ids ...')
  let ids = await query(queryScript).then(r => r.map(row=>row.oppId))
  let { status, rowCount, error } = await _store_temp(
    sourceFile, 
    tempFile, 
    ids
  )
  if (error) {
    throw error
  }
  if (rowCount==0) {
    console.log('No rows to upload, bq data is up-to-date')
    return
  }
  let metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    schema: {
      fields: [
        {name: 'oppId', type: 'STRING', mode: 'REQUIRED'},
        {name: 'updateId', type: 'STRING'},
        {name: 'findingBlock', type: 'INTEGER'},
        {name: 'pathId', type: 'STRING'},
        {name: 'amountIn', type: 'NUMERIC'},
        {name: 'predictedGrossProfit', type: 'NUMERIC'},
        {name: 'predictedNetProfit', type: 'NUMERIC'},
        {name: 'predictedGas', type: 'INTEGER'},
        {name: 'txHash', type: 'STRING'},
        {name: 'internalError', type: 'STRING'},
        {name: 'executionTime', type: 'INTEGER'},
      ],
    },
    location: 'US',
    writeDisposition: 'WRITE_TRUNCATE',
    rangePartitioning: {
      "field": "findingBlock",
      "range": {
        "start": 0,
        "end": 10000,
        "interval": 1
      },
    }, 
    clustering: {
      "fields": [
        "oppid",
        "updateId",
        "findingBlock",
        "pathId"
      ]
    } 
  }
  let setting = {
    sourceFile: tempFile, 
    datasetId: 'avalanche_bot_v0', 
    tableId: 'opportunities', 
    metadata
  }
  console.log(`Uploading ${rowCount} rows to bq...`)
  await uploadFromCsv(setting)
  fs.unlinkSync(tempFile)
  console.log('Finished')
}

async function uploadUpdates() {
  console.log('\n// UPDATES \\\\\n...')
  // let sourceFile = './avalanche/logs/update.csv'
  // let tempFile = './avalanche/logs/.temp/update.csv'
  let sourceFile = './avalanche/tools/data/dst/update.csv'
  let tempFile = './avalanche/tools/data/dst/.tempupdate.csv'
  let queryScript = `
    SELECT updateId
    FROM \`avalanche-304119.avalanche_bot_v0.updates\`
  `
  console.log('Querying the chain for uploded ids ...')
  let ids = await query(queryScript).then(r => r.map(row=>row.updateId))
  let { status, rowCount, error } = await _store_temp(
    sourceFile, 
    tempFile, 
    ids
  )
  if (error) {
    throw error
  }
  if (rowCount==0) {
    console.log('No rows to upload, bq data is up-to-date')
    return
  }
  let metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    schema: {
      fields: [
        {name: 'updateId', type: 'STRING', mode: 'REQUIRED'},
        {name: 'blockNumber', type: 'INTEGER', mode: 'REQUIRED'},
        {name: 'traderAddress', type: 'STRING'},
        {name: 'nodeIp', type: 'STRING'},
        {name: 'startTimestamp', type: 'INTEGER'},
        {name: 'processingTime', type: 'INTEGER'},
        {name: 'updatedPools', type: 'STRING'},
        {name: 'searchedPaths', type: 'INTEGER'}, 
        {name: 'index', type: 'INTEGER'}
      ],
    },
    location: 'US',
    writeDisposition: 'WRITE_APPEND',
    rangePartitioning: {
      "field": "blockNumber",
      "range": {
        "start": 0,
        "end": 10000,
        "interval": 1
      },
    }, 
    clustering: {
      "fields": [
        "blockNumber",
        "traderAddress",
        "nodeIp",
      ]
    } 
  }
  let setting = {
    sourceFile: tempFile, 
    datasetId: 'avalanche_bot_v0', 
    tableId: 'updates', 
    metadata
  }
  console.log(`Uploading ${rowCount} rows to bq...`)
  await uploadFromCsv(setting)
  fs.unlinkSync(tempFile)
  console.log('Finished')
}


async function main() {
  await uploadUpdates()
  await uploadOpportunities()
}

main()
