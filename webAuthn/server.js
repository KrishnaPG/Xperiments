const { Fido2Lib } = require("fido2-lib");
const fido2 = new Fido2Lib({
	timeout: 60000,
	rpId: "example.com",
	rpName: "ACME",
	rpIcon: "https://cenacle.co.in/images/logo.png",
	challengeSize: 128,
	attestation: "direct",
	cryptoParams: [-7, -257],
	authenticatorAttachment: "platform",
	authenticatorRequireResidentKey: false,
	authenticatorUserVerification: "required"	
});

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9090 });

const fs = require('fs');

function b64ToAB(b64Str) {
	const buf = Buffer.from(b64Str, "base64");
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

wss.on('connection', (ws, req) => {
	console.log("connected: ", req.connection.remoteAddress);

	ws.on('message', async (message) => {
		console.log('received: ', message);
		let jsonReq = {};
		try {
			jsonReq = JSON.parse(message);
		} catch (ex) {
			ws.send(JSON.stringify({
				jsonrpc: "2.0",
				error: { "code": -32700, "message": `Parse error: ${ ex.message }` },
				id: null
			}));
			return;
		}
		switch (jsonReq.method) {
			case "echo": {
				ws.send(JSON.stringify(jsonReq));
				break;
			}
			case "register": {
				const registrationOptions = await fido2.attestationOptions();
				registrationOptions.user.id = Math.random();
				registrationOptions.user.name = jsonReq.params.username;
				registrationOptions.user.displayName = jsonReq.params.displayName;
				const challenge = registrationOptions.challenge; console.log("challenged: ", challenge);
				const response = JSON.stringify({ id: jsonReq.id, result: registrationOptions })
				ws.send(response); console.log("response: ", response);
				break;
			}
			case "register.finish": { 				
				fs.writeFile(`./req-${Date.now()}.json`, message, function (err) {
					if (err) {
						return console.log(err);
					}
					console.log("The file was saved!");
				});				
				const paramAttResponse = jsonReq.params.attestationResponse;
				const attResponse = {
					id: paramAttResponse.id,
					rawId: b64ToAB(paramAttResponse.rawId),
					response: {
						clientDataJSON: b64ToAB(paramAttResponse.response.clientDataJSON),
						attestationObject: b64ToAB(paramAttResponse.response.attestationObject)
					},
					type: paramAttResponse.type
				};
				const attExpectations = {
					challenge: jsonReq.params.challenge,
					origin: jsonReq.params.origin,
					factor: "either"
				};
				console.log("client response: ", attResponse);
				const result = await fido2.attestationResult(attResponse, attExpectations);
				console.log("result: ", result);
				ws.send(JSON.stringify(result));
			}
			default: {
				return ws.send(JSON.stringify({
					jsonrpc: "2.0",
					error: { "code": -32601, "message": `Method not found: ${ jsonReq.method }` },
					id: jsonReq.id
				}));
			}
		}
	});

	process.on('unhandledRejection', (reason, p) =>
		console.error(`Unhandled Rejection ${reason.stack}`)
	);
	
});