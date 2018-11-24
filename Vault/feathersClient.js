/**
 * Copyright 2018 Cenacle Research India Private Limited
 */

const io = require('socket.io-client');
const feathers = require('@feathersjs/feathers');
const socketio = require('@feathersjs/socketio-client');
const configuration = require('@feathersjs/configuration');

const client = feathers(); console.log("feather initialized");

client.configure(configuration());
const serverConfig = client.get("Fict").server;
client.configure(socketio(io(serverConfig.url, serverConfig.options)));

module.exports = client;