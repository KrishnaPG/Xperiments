/**
 * Copyright 2018 Cenacle Research India Private Limited.
 */
const Axios = require('axios');
const UUID = require('uuid-random');
//const NACL = require('tweetnacl');
import { encode as toBase64, decode as fromBase64 } from '64';
const sodiumNative = require('sodium-native');

const serviceRegistry = require('./serviceProvider');
const app = serviceRegistry.feathersClient;

function newX25519KeyPair() {
	const publicKey= Buffer.alloc(sodiumNative.crypto_sign_PUBLICKEYBYTES);
	const secretKey= Buffer.alloc(sodiumNative.crypto_sign_SECRETKEYBYTES);
	sodiumNative.crypto_box_keypair(publicKey, secretKey);
	return { publicKey: publicKey.toString("base64"), secretKey: secretKey.toString("base64") };
}

/**
 * Wrapper over the transit key functionality of Vault. This
 * would not expose the secretKey to the caller, but allows
 * the caller to perform the encryption, decryption in a secure way.
 */
class transitX25519KeyPair {
	constructor(uid) {
		this.uid = uid;
	}
}

/**
 * Wrapper over the secret key functionality of Vault. This 
 * should never expose the secretKey to the caller.
 */
class secretDataKeyPair {
	constructor(uid, axiosInstance) {
		this.uid = uid;
		this.axiosInstance = axiosInstance;
	}
	getPublicKey(errCB = console.error) { console.log("get public key invoked");
		return this.axiosInstance.get(`secret/data/${this.uid}`)
			.then(response => { return response.data.data.data.publicKey })
			.catch(errCB);
	}	
}

/**
 * Secure Vault wrapper around https://github.com/hashicorp/vault
 */
class Vault {
	constructor({ baseURL, ...options }) {
		if(!baseURL.endsWith('/')) baseURL += '/';
		this.axiosInstance = Axios.create({baseURL, ...options});
	}
	init({ role_id, secret_id }, errCB = console.error) {
		this.role_id = role_id;
		this.secret_id = secret_id;
		return this.axiosInstance
		.post('auth/approle/login', { role_id, secret_id })
		.then(response => {
			this.axiosInstance.defaults.headers.common['X-Vault-Token'] = response.data.auth.client_token;
		}).catch(errCB);
	}
	createX25519KeyPair(uid = UUID(), errCB = console.error) {
		// Currently transit do not support x25519 encryption, so we do not use them here.	
		// Instead we create the keys manually and store them in the vault, using secret keys
		return this.axiosInstance
			// .post(`transit/keys/${uid}`, { derived: true, type: 'x25519' }) 
			.post(`secret/data/${uid}`, { data: newX25519KeyPair() })
			.then(() => { return new secretDataKeyPair(uid, this.axiosInstance); })
			.catch(errCB);
	}
}

const vaultOptions = app.get("Vault");
const v = new Vault(vaultOptions.server);
v.init(vaultOptions.login).then(async ()=>{
	const keyPair = await v.createX25519KeyPair(); // create a new keyPair. We will never know what the secretKey is.
	serviceRegistry.registerServiceProvider({
		publicKey: await keyPair.getPublicKey()
	}).then(console.log);
});

process.on('unhandledRejection', (reason, p) =>
	console.error('Unhandled Rejection at: Promise ', p, reason)
);
