/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

import { debug } from 'util';

const NodeRSA = require('node-rsa');	

import UID from './uid';
import largeRSA from './largeRSA';

export default {
	ASPR: {
		Request: {
			encrypt: function (msg, receiverPublicKey) { // returns a tracker where the response will be received
				const TKeyPair = NodeRSA({ b: 512 });	// Temporary Keypair. Anything less than 512 seems to be causing problem !!
				const senderSignedMsg = largeRSA.encryptPrivate(msg, TKeyPair);
				const metadata = {
					v: 'ASPR/req/v1',
					token: UID.randomID(),
					pk: TKeyPair.exportKey('public'),
					payload: senderSignedMsg
				};
				const encryptedMsg = largeRSA.encryptPublic(JSON.stringify(metadata),  new NodeRSA(receiverPublicKey));
				return { token: metadata.token, keyPair: TKeyPair, encryptedMsg  };
			},
			decrypt: function (obj, receiverPrivateKey) {
				const metadata = JSON.parse(largeRSA.decryptPrivate(obj, new NodeRSA(receiverPrivateKey)));
				metadata.msg = largeRSA.decryptPublic(metadata.payload, new NodeRSA(metadata.pk));
				return metadata;
			}			
		},
		Response: {
			// @param requestObj: same as the return value of ASPR.Request.decrypt()
			encrypt: function(msg, senderId, senderPrivateKey, requestObj) {
				const senderSignedMsg = largeRSA.encryptPrivate(msg, new NodeRSA(senderPrivateKey));
				const metadata = {
					v: 'ASPR/res/v1',
					token: requestObj.token,
					senderId,
					payload: senderSignedMsg
				};
				const encryptedMsg = largeRSA.encryptPublic(JSON.stringify(metadata), new NodeRSA(requestObj.pk));
				return { token: metadata.token, encryptedMsg };
			},
			decrypt: async function(obj, receiverPrivateKey, senderPKFn) {
				const metadata = JSON.parse(largeRSA.decryptPrivate(obj, new NodeRSA(receiverPrivateKey)));
				const senderPublicKey = await senderPKFn(metadata.senderId);
				metadata.msg = largeRSA.decryptPublic(metadata.payload, new NodeRSA(senderPublicKey));
				return metadata;
			}
		}
	},
	PSPR: {
		Request: {
			encrypt: function (msg, senderId, senderPrivateKey, receiverPublicKey) {
				const senderSignedMsg = largeRSA.encryptPrivate(msg, new NodeRSA(senderPrivateKey));
				const metadata = {
					v: 'PSPR/req/v1',
					token: UID.randomID(),
					senderId,
					payload: senderSignedMsg
				};
				const encryptedMsg = largeRSA.encryptPublic(JSON.stringify(metadata), new NodeRSA(receiverPublicKey));
				return { token: metadata.token, encryptedMsg };
			},
			decrypt: async function (obj, receiverPrivateKey, senderPKFn) {
				const metadata = JSON.parse(largeRSA.decryptPrivate(obj, new NodeRSA(receiverPrivateKey)));
				const senderPublicKey = await senderPKFn(metadata.senderId);				
				metadata.msg = largeRSA.decryptPublic(metadata.payload, new NodeRSA(senderPublicKey));
				return metadata;
			}
		},
		Response: {
			// @param requestObj: same as the return value of ASPR.Request.decrypt()
			encrypt: async function (msg, senderId, senderPrivateKey, requestObj, receiverPKFn) {
				const senderSignedMsg = largeRSA.encryptPrivate(msg, new NodeRSA(senderPrivateKey));
				const metadata = {
					v: 'PSPR/res/v1',
					token: requestObj.token,
					senderId,
					payload: senderSignedMsg
				};
				const receiverPublicKey = await receiverPKFn(requestObj.senderId);
				const encryptedMsg = largeRSA.encryptPublic(JSON.stringify(metadata), new NodeRSA(receiverPublicKey));
				return { token: metadata.token, encryptedMsg };
			},
			decrypt: async function (obj, receiverPrivateKey, senderPKFn) {
				const metadata = JSON.parse(largeRSA.decryptPrivate(obj, new NodeRSA(receiverPrivateKey)));
				const senderPublicKey = await senderPKFn(metadata.senderId);
				metadata.msg = largeRSA.decryptPublic(metadata.payload, new NodeRSA(senderPublicKey));
				return metadata;
			}
		}
	}	
};