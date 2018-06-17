<template>
	<div>
		<v-row :gutter="16">
			<v-col span="12">
				<h3>Patient</h3>
				<ul>
					<li v-for="item in p1RequestHistory">
						{{item.token}}: {{item.msg}}
					</li>
				</ul>
				<v-input v-model="p1Text" @keyup.enter.native="keyupP1"></v-input>				
			</v-col>
			<v-col span="12">
				<h3>Hospital</h3>
				<ul>
					<li v-for="item in h1ReceiveHistory">
						<v-row :gutter="16">
							<v-col span="12">{{item.token}}: {{item.msg}}</v-col>
							
							<v-col span="12"><v-input v-model="item.response" @keyup.enter.native="keyupH1(item)"></v-input>	</v-col>						
						</v-row>
					</li>
				</ul>
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
				p1Text: "",
				h1Text: "",
				p1RequestHistory: [],
				h1ReceiveHistory: [],
				p1Key: new NodeRSA({b: 512}),
				h1Key: new NodeRSA({b: 512})
			}
		},
		methods: {
			keyupP1: function(val) {
				const Msg = this.p1Text; 
				const sentObj = ZKP.ASPR.Request.encrypt(Msg, this.h1Key.exportKey('public'));
				sentObj.msg = Msg;
				this.p1RequestHistory.push(sentObj);

				const receivedObj = ZKP.ASPR.Request.decrypt(sentObj.encryptedMsg, this.h1Key.exportKey('private'));
				this.h1ReceiveHistory.push(receivedObj);

				// const p1PvtEncrypted = this.p1Key.encryptPrivate(Msg, 'base64');
				// const h1PubEncrypted = this.h1Key.encrypt(p1PvtEncrypted, 'base64', 'base64');
				// const h1PvtDecrypted = this.h1Key.decrypt(h1PubEncrypted, 'base64', 'base64');
				// const p1PubDecrypted = this.p1Key.decryptPublic(h1PvtDecrypted, 'utf8');
			},
			keyupH1: function(val) {
				//this.h1ReceiveHistory.push(this.h1Text);
				console.log("val: ", val);
			}
		}
	}
</script>