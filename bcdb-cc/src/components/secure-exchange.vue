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
	import ZKP from './zkp.js';
	export default {
		name: 'secure-exchange-ui',
		data: function(){
			return {
				p1Text: "From p1: ",
				h1Text: "From h1: ",
				p1History: [],
				h1History: [],
				p1Key: new NodeRSA({b: 512}),
				h1Key: new NodeRSA({b: 512})
			}
		},
		methods: {
			keyupP1: function(val) {
				const Msg = this.p1Text; 
				const encResult = ZKP.ASPR_Request(Msg, this.h1Key.exportKey('public')); console.log("encResult: ", encResult);

				ZKP.ASPR_Decrypt(encResult.encryptedMsg, this.h1Key.exportKey('private'));

				this.p1History.push(Msg);
				const p1PvtEncrypted = this.p1Key.encryptPrivate(Msg, 'base64');
				const h1PubEncrypted = this.h1Key.encrypt(p1PvtEncrypted, 'base64', 'base64');
				const h1PvtDecrypted = this.h1Key.decrypt(h1PubEncrypted, 'base64', 'base64');
				const p1PubDecrypted = this.p1Key.decryptPublic(h1PvtDecrypted, 'utf8');
			},
			keyupH1: function(val) {
				this.h1History.push(this.h1Text);
			}
		}
	}
</script>