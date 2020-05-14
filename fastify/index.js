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

fastify.addHook('onClose', (instance, done) => {
	// instance.kenx.destroy();
	done();
});

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