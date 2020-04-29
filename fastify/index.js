const atExit = require('exit-hook'); //Graceful shutdown on termination

// Require the framework and instantiate it
const fastify = require('fastify')({
	ignoreTrailingSlash: true,
	http2: false,
	logger: (process.env.NODE_ENV == "dev" ? {
		prettyPrint: true,
	} : false)
});

const opts = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					hello: { type: 'string' }
				}
			}
		}
	}
};

const routes = {
"admin": {},
"api": {},
"view": {},
};

fastify.get('/api/*', {
	'prefixTrailingSlash': 'both'
}, (req, res) => {
		console.log("body", req.body)
		console.log("query", req.query)
		console.log("params", req.params)
		console.log("headers", req.headers)
		console.log("id", req.id)
		console.log("ip", req.ip)
		console.log("ips", req.ips)
		console.log("hostname", req.hostname);  		
		res.send({ req: req.params });
});

/* Declare a route
fastify.get('/:aavType/:aavPath', function (request, reply) {
	
	console.log("body", request.body)
	console.log("query", request.query)
	console.log("params", request.params)
	console.log("headers", request.headers)
	console.log("raw", request.raw)
	console.log("id", request.id)
	console.log("ip", request.ip)
	console.log("ips", request.ips)
	console.log("hostname", request.hostname);  
	reply.send({ type: request.params.aavType, path: request.params.aavPath });
})
*/

// Run the server!
fastify.listen(3000, '0.0.0.0', function (err, address) {
	if (err) {
		fastify.log.error(err)
		process.exit(1)
	}
	fastify.log.info(`server listening on ${address}`)
});

atExit(() => {
	fastify.close();
});