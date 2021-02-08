const arbbot = require('./arbbot')
const { connectToWsProvider } = require('./provider')
var provider

const HEARTBEAT_INTERVAL_SECONDS = 100;
var timeOfLastBlock;

async function heartbeatCheck() {
	console.log('heartbeat check!')
	console.log(timeOfLastBlock)
	if (timeOfLastBlock) {
		let now = Date.now();
		let msAgo = now- timeOfLastBlock
		console.log(msAgo)
		if (msAgo > HEARTBEAT_INTERVAL_SECONDS * 1000) {
			console.log("=====heartbeat failed=====", now, msAgo / 1000);
			console.log("Listener Count:", provider.listenerCount());
			provider.removeAllListeners();
			console.log("Listener Count:", provider.listenerCount());
			// process.exit(0);
			console.log('restarting the provider')
			run()
		}
	}
}

async function startHeartbeatCheck() {
	await heartbeatCheck();
	setTimeout(startHeartbeatCheck, HEARTBEAT_INTERVAL_SECONDS * 1000);
}

// async function main() {
//     var currentBlockNumber
//     provider.on("block", async (blockNumber) => {
//             const t0 = Date.now()
//             if (currentBlockNumber >= blockNumber) {
//                 console.log(
//                     blockNumber, 
//                     "| Stale block vs", currentBlockNumber,
//                     ", ignoring block"
//                 );
//                 return;
//             }
// 			currentBlockNumber = blockNumber;
// 			timeOfLastBlock = Date.now()
//             arbbot.handleNewBlock(currentBlockNumber).then(() => {
// 				console.log(`Runtime: ${((Date.now()-t0)/1000).toFixed(2)}sec`)
// 			})
//     })
// }

async function run() {
	console.log('Starting new provider')
	var currentBlockNumber
	provider = await connectToWsProvider() // Default is websockets
	arbbot.initialize(provider)  // Initialize functions with a new provider
	provider._websocket.on('close', async (code) => {
		console.log('ws-closed', code)
		provider._websocket.terminate()
		setTimeout(init, 2000)
	})
	provider.on("block", async (blockNumber) => {
		const t0 = Date.now()
		if (currentBlockNumber >= blockNumber) {
			console.log(
				blockNumber, 
				"| Stale block vs", currentBlockNumber,
				", ignoring block"
			);
			return
		}
		currentBlockNumber = blockNumber
		timeOfLastBlock = Date.now()
		console.log('Handling a new block: ', blockNumber)
		arbbot.handleNewBlock(currentBlockNumber).then(() => {
			console.log(`Runtime: ${((Date.now()-t0)/1000).toFixed(2)}sec`)
		})
	})
	process.on('unhandledRejection', (reason, p) => {
	    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason.stack)
	})
}


startHeartbeatCheck()
run()

// startHeartbeatCheck()
// main()
// 	.catch(error => {
// 		console.log("main::catch")
// 		provider.removeAllListeners();
// 		console.error(error);
// 		main();
// 		process.exit(1);
// 	});