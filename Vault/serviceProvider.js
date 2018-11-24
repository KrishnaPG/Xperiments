/**
 * Copyright 2018 Cenacle Research India Private Limited
 * 
 * ServiceProvider.js is used by developers as part of the SDK, to 
 * register their provider. Each provider may offer mutiple services.
 * Provider need to have a listening address, and handler function.
 * Provider may start / stop listening at the address.
 * 
 * For non-javascript clients, we may have to accept a Webhook as the handler function.
 * If we have a REST API, then it will accept the webhook as the handler.
 * 
 * This code probably runs on the client's machine somewhere, or in a mobile app on the user side
 */
	
 const feathersClient = require('./feathersClient');

 function registerServiceProvider({providerName, providerAddress, serviceDescription, uid, publicKey}, handler) {
	 console.log("public key ", publicKey)
	 return feathersClient.service('serviceProvider').create({ providerName, providerAddress, serviceDescription, uid, publicKey });
	 // register the metadata into service-provider database (which also creates the keyPair)
	 //featherservice('serviceProvider').create(); // add new entry or return existing one with ID
	 // start listening at the uid - server side code has to validate that this id is indeed owned by this caller
	 //registerHandler(id, {data signed with private key linked to the id}, handler) 
	 // the id may need to be clearly indicated if it is publickey or lookup address (so that the server code)
	 // can do lookup or directly apply the publickey.
	 // registerHandler must be another API wrapper around the crossbar / cote
 }

 module.exports = {
	 feathersClient,
	 registerServiceProvider
 }