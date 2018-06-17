import { debug } from 'util';

const NodeRSA = require('node-rsa');	
const UUIDV1 = require('uuid/v1');
export default {
	// Long messages cannot be used with RSA public/private key mechanism.
	// So we encrypt the message with symmetric AES and use RSA on the password.
	largeEncrypt: function(msg, encFn, ...fnArgs) {
		const password = UUIDV1(); console.log("password: ", password);
		const aesEncryptedMsg = sjcl.encrypt(password, msg);
		const encryptedPassword = encFn(password, fnArgs);
		return { pw: encryptedPassword, msg: aesEncryptedMsg };
	},
	largeDecrypt: function(encObj, decFn, ...fnArgs) {
		const decryptedPassword = decFn(encObj.pw, fnArgs);
		return sjcl.decrypt(decryptedPassword, encObj.msg);
	},
	ASPR_Request: function (msg, receiverPublicKey, senderPassword = null) { // returns a tracker where the response will be received
		const TKeyPair = NodeRSA({ b: 512 });	// Temporary Keypair
		const senderSignedMsg = this.largeEncrypt(msg, (pw, [keyPair]) => { debugger;
			return keyPair.encryptPrivate(pw, "base64") 
		}, TKeyPair);
		const metadata = {
			v: 'ASPR/v1',
			token: UUIDV1(),
			pk: TKeyPair.exportKey('public'),
			payload: senderSignedMsg
		};
		const encryptedMsg = this.largeEncrypt(JSON.stringify(metadata), (pw, [keyPair]) => { return keyPair.encrypt(pw, "base64") },  new NodeRSA(receiverPublicKey));
		return { token: metadata.token, keyPair: TKeyPair, encryptedMsg  };
	},
	ASPR_Decrypt: function (obj, receiverPrivateKey) {
		const metadata = JSON.parse(this.largeDecrypt(obj, (encPw, [keyPair]) => { return keyPair.decrypt(encPw, "utf8") }, new NodeRSA(receiverPrivateKey)));
		console.log("decrypt metadata: ", metadata);
		const msg = this.largeDecrypt(metadata.payload, (encPw, [keyPair]) => { return keyPair.decryptPublic(encPw, "utf8") }, new NodeRSA(metadata.pk));
		console.log("msg: ", msg);
		//const metadata = receiverKey.decrypt(obj.encryptedPayload, "utf8"); console.log("decypted metadata: ", metadata);
	}
};