<template>
	<div>
		<v-row :gutter="16">
			<v-col span="12">
				<h2>Patient</h2>
				<hr/>
				<table id="patient">
					<thead>
						<tr>
							<th>Id</th>
							<th>Msg</th>
							<th>Response</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in p1RequestHistory" :key="item.token">
							<td>{{item.token}}</td>
							<td>{{item.msg}}</td>
							<td><b>{{item.response}}</b></td>
						</tr>
					</tbody>
				</table>
				<v-input placeholder="" v-model="p1Text" @keyup.enter.native="keyupP1"></v-input>				
			</v-col>
			<v-col span="12">
				<h2>Hospital</h2>
				<hr/>
				<table id="hospital">
					<thead>
						<tr>
							<th>Id</th>
							<th>Msg</th>
							<th>Response</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in h1ReceiveHistory" :key="item.token">
							<td>{{item.token}}</td>
							<td>{{item.msg}}</td>
							<td>
								<v-input v-model="item.response" @keyup.enter.native="keyupH1(item)"></v-input>
							</td>
						</tr>
					</tbody>
				</table>	
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
			},
			keyupH1: async function(receivedItem) {
				const token = receivedItem.token;
				const sentObj = ZKP.ASPR.Response.encrypt(receivedItem.response, "<sender id>", this.h1Key.exportKey("private"), receivedItem);
				
				const requestIndex = _.findIndex(this.p1RequestHistory, h => { return h.token == sentObj.token });
				const requestObj = this.p1RequestHistory[requestIndex];
				const TKeyPair = requestObj.keyPair;
				const receivedObj = await ZKP.ASPR.Response.decrypt(sentObj.encryptedMsg, TKeyPair.exportKey("private"), async (id) => { return this.h1Key.exportKey("public"); });
				requestObj.response = receivedObj.msg;
				Vue.set(this.p1RequestHistory, requestIndex, requestObj); // Vue.set() required for array changes to be reactive
			}
		}
	}
</script>
<style>
	table {
		width: 100%;
	}
	table > td {
		padding: 10px;
	}
	table#patient {
	}
</style>