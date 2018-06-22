<template>
	<div>
		<v-row :gutter="16">
			<v-col span="12">
				<h2>Patient OTP</h2>
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
							<td>
								<b>{{item.response}}</b>
							</td>
						</tr>
					</tbody>
				</table>
				<v-input placeholder="" v-model="p1Text" @keyup.enter.native="keyupP1"></v-input>
			</v-col>
			<v-col span="12">
				<h2>Hospital OTP</h2>
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
	export default {
		name: 'otp'
	}
</script>