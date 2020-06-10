const atExit = require('exit-hook'); //Graceful shutdown on termination

const { Database, aql: AQL } = require('arangojs');

const dbConfig = {
	url: "http://localhost:8529",
	dbName: "default",
	auth: {
		username: "test",
		password: "password"
	}
};
const db = new Database(dbConfig);
db.useDatabase(dbConfig.dbName);
db.useBasicAuth(dbConfig.auth.username, dbConfig.auth.password);

const collMethods = {
	"findOne": (coll, query) => coll.firstExample(query),
	"findMany": (coll, ids) => coll.lookupByKeys(ids),
	"find": (coll, { offset, limit, sort, desc }) => {
		return db.query(AQL`
				FOR r IN ${coll}
				LIMIT ${offset}, ${limit}
				SORT r.${sort} ${desc ? "DESC" : "ASC"}
				RETURN r
		`).then(cursor => cursor.all());
	}
}

function makeCollectionQuery(method, { collName, query }) {
	const coll = db.collection(collName);
	const fn = collMethods[method];
	if (!fn) return Promise.reject({ code: -32601, message: "Method not found", ctx: { method, collName } });
	return fn(coll, query);
}

// Require the framework and instantiate it
const fastify = require('fastify')({
	ignoreTrailingSlash: true,
	http2: false,
	logger: (process.env.NODE_ENV == "dev" ? {
		prettyPrint: true,
	} : false)
});

fastify.register(require('fastify-websocket'), {
	handle: conn => console.log("on connect: ", conn),
	options: {
		maxPayload: 1048576,		// maximum 1MB size message
		path: '',						// only accept matching paths of ws://localhost:3000/ws
		verifyClient: function ({ origin, req, source }, next) {	// Ref: https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback
			if (req.headers['x-fastify-header'] == 'fastify is awesome !') {
				return next(false, 401, "unAuthorized", { 'x-Retry-After': 120 });
			}
			next(true);
		}
	}
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

function safeParse(jsonStr) {
	try {
		return JSON.parse(jsonStr);
	}
	 catch (ex) {
		fastify.log.trace("JSON.parse failed for: " + jsonStr);
	}
}

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

fastify.route({
	method: 'GET',
	url: '/schepes',
	handler: (req, res) => res.send({ hello: "world from http" }),
	wsHandler: (conn, req) => {
		conn.socket.on("message", msg => {
			console.log("socket message: ", msg);
			const rpcReq = safeParse(msg);
			if (!rpcReq) return; // conn.socket.send(`{"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}`);
			makeCollectionQuery(rpcReq.method, rpcReq.params).then(result => conn.socket.send(JSON.stringify({
				jsonrpc: "2.0",
				id: rpcReq.id,
				result
			}))).catch(ex => {
				const error = { code: ex.code, message: ex.message, ctx: ex.ctx };
				conn.socket.send(`{"jsonrpc": "2.0", "error": ${JSON.stringify(error)}, "id": "${rpcReq.id}"}`);
			});
		});
		conn.on("close",() => { console.log("connection closed"); conn.end(); });
	}
});

fastify.addHook('onClose', (instance, done) => {
	// instance.kenx.destroy();
	done();
});

// Run the server!
fastify.listen(3000, '0.0.0.0', function (err, address) {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	fastify.log.info(`server listening on ${address}`);
});

atExit(() => {
	fastify.close();
});