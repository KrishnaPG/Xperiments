<template>
	<div>
		<v-row :gutter="16">
			<v-col span="12">
				<h3>Patient</h3>
				<ul>
					<li v-for="item in p1History">
						{{item}}
					</li>
				</ul>
				<v-input v-model="p1Text" @keyup.enter.native="keyupP1"></v-input>				
			</v-col>
			<v-col span="12">
				<h3>Hospital</h3>
				<ul>
					<li v-for="item in h1History">
						{{item}}
					</li>
				</ul>
				<v-input v-model="h1Text" @keyup.enter.native="keyupH1"></v-input>
			</v-col>
		</v-row>
	</div>
</template>
<script>
	const NodeRSA = require('node-rsa');	
	const UUIDV1 = require('uuid/v1');
	export default {
		name: 'secure-exchange-ui',
		data: function(){
			return {
				p1Text: "From p1: ",
				h1Text: "From h1: ",
				p1History: [],
				h1History: [],
				p1Key: new NodeRSA({b: 256}),
				h1Key: new NodeRSA({b: 256})
			}
		},
		methods: {
			keyupP1: function(val) {
				const Msg = this.p1Text; this.ASPR_Request(Msg, this.h1Key.exportKey('public'));
				this.p1History.push(Msg);
				console.log("Msg: ", Msg);
				const p1PvtEncrypted = this.p1Key.encryptPrivate(Msg, 'base64');
				console.log("p1PvtEncrypted: ", p1PvtEncrypted);
				const h1PubEncrypted = this.h1Key.encrypt(p1PvtEncrypted, 'base64', 'base64');
				console.log("h1PubEncrypted: ", h1PubEncrypted);
				const h1PvtDecrypted = this.h1Key.decrypt(h1PubEncrypted, 'base64', 'base64');
				console.log("h1PvtDecrypted: ", h1PvtDecrypted);
				const p1PubDecrypted = this.p1Key.decryptPublic(h1PvtDecrypted, 'utf8');
				console.log("p1PubDecrypted: ", p1PubDecrypted);
			},
			keyupH1: function(val) {
				this.h1History.push(this.h1Text);
			},
			ASPR_Request: function(msg, receiverPublicKey, senderPassword = null) { // returns a tracker where the response will be received
				// Long messages cannot be used with RSA public/private key mechanism.
				// So we encrypt the message with symmetric AES and use RSA on the password.
				if(!senderPassword) senderPassword = UUIDV1(); // generate a random UUID as password to use for AES encryption
				const aesEncryptedMsg = sjcl.encrypt(senderPassword, msg);				
				const TKeyPair = NodeRSA({b: 64});	// we use this encrypt the password which is UUID of length 256 bytes
				const metadata = {
					from: {
						token: UUIDV1(),
						publicKey: TKeyPair.exportKey('public')
					},
					payload: {
						aesPassword: TKeyPair.encryptPrivate(senderPassword, 'base64'),
						aesEncryptedMsg
					}
				};
				const receiverKey = new NodeRSA({ b: 256 });
				receiverKey.importKey(receiverPublicKey, "public");
				const encryptedPayload = receiverKey.encrypt(metadata, "base64"); console.log(encryptedPayload);
				return { token: metadata.from.token, keyPair: TKeyPair };
			}
		}
	}
</script>