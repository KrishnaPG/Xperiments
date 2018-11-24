/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

const SJCL = require('sjcl');	// AES Encryption
import UID from './uid';

// Long messages cannot be used with RSA public/private key mechanism.
// So we encrypt the message with symmetric AES and use RSA on the password.
// AES Symmetric key (password) should be at least 128 bit (16 byte).
export default {
	largeEncrypt: function (msg, encFn, ...fnArgs) {
		const password = UID.randomID();
		const aesEncryptedMsg = SJCL.encrypt(password, msg);
		const encryptedPassword = encFn(password, fnArgs);
		return { pw: encryptedPassword, msg: aesEncryptedMsg }; //TODO: add pwHash (encrypted password hash)
	},
	largeDecrypt: function (encObj, decFn, ...fnArgs) {
		const decryptedPassword = decFn(encObj.pw, fnArgs);
		return SJCL.decrypt(decryptedPassword, encObj.msg);
	},
}