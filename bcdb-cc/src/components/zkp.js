/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

import { debug } from 'util';

const NodeRSA = require('node-rsa');	

import largeEnDec from './largeEnDec';
import UID from './uid';
import largeRSA from './largeRSA';

export default {
	ASPR: {
		Request: {
			encrypt: function (msg, receiverPublicKey) { // returns a tracker where the response will be received
				const TKeyPair = NodeRSA({ b: 512 });	// Temporary Keypair. Anything less than 512 seems to be causing problem !!
				const senderSignedMsg = largeRSA.encryptPrivate(msg, TKeyPair);
				const metadata = {
					v: 'ASPR/v1',
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

		}
	}
};