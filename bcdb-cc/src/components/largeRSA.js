/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

import largeEnDec from './largeEnDec';
const NodeRSA = require('node-rsa');	

export default {
	encryptPrivate: function(msg, keyPair, encoding = "base64") {
		return largeEnDec.largeEncrypt(msg, (pw, [keyPair]) => {
			return keyPair.encryptPrivate(pw, encoding);
		}, keyPair);
	},
	encryptPublic: function(msg, keyPair, encoding = "base64") {
		return largeEnDec.largeEncrypt(msg, (pw, [keyPair]) => { 
			return keyPair.encrypt(pw, encoding);
		}, keyPair);		
	},
	decryptPrivate: function(encObj, keyPair, encoding = "utf8") {
		return largeEnDec.largeDecrypt(encObj, (encPw, [keyPair]) => { 
			return keyPair.decrypt(encPw, encoding);
		}, keyPair);
	},
	decryptPublic: function(encObj, keyPair, encoding = "utf8") {
		return largeEnDec.largeDecrypt(encObj, (encPw, [keyPair]) => { 
			return keyPair.decryptPublic(encPw, encoding);
		}, keyPair);
	}
}
