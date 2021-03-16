const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const server = require('./eventListener')
const paths = require('./config/paths.json')

console.log(`Running on ${numCPUs} CPUs`)
if (cluster.isMaster) {
	process.env.PATH_INDEX = 0
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
		process.env.PATH_INDEX ++
	}
	cluster.on('exit', (worker, code, signal) => {
		console.log(`worker ${worker.process.pid} died`);
	});
} else {
    console.log('Starting new process with index', process.env.PATH_INDEX)
	let pathIndex = parseInt(process.env.PATH_INDEX)
    server.init(pathIndex, numCPUs)
}