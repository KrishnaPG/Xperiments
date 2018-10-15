<template>
  <div id="app">
    <v-button @click="transfer">Transfer</v-button>
    <v-button @click="getConditions">Get Conditions</v-button>
    <p>Last Transaction: <a :href="lastTransactionURI" target="_blank">{{lastTransactionId}}</a> </p>
    <p>Last Transaction:  Win: {{userWin}}  Loss:{{userLoss}}  Balance: {{accountBalance}} <br/>Bookie Balance: {{bookieBalance}}</p>
    <hr>
    <!-- <secure-exchange-ui></secure-exchange-ui> -->
    <tagDice ref="dice" v-on:roll="onRoll"></tagDice>
    <h4 id="result" v-if="rolls.length">Numbers Rolled: <br/>{{rolls}}</h4>
    <hr>
    <table>
      <thead>
        <tr><th>Outcome</th><th>Odds</th><th>Bet Amount</th></tr>
      </thead>
      <tbody>
        <tr v-for="(name, index) in betNames">
          <td>{{name}}</td>
          <td>{{betOdds[index]}}</td>
          <td>
            <v-input-number v-model="betAmounts[index]" placeholder="0" value="0"/>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
const tagDice = resolve => require(['@/components/dice'], resolve);
import secureExchangeUi from '@/components/secure-exchange';
const Buffer = require('buffer').Buffer;
const BigchainDB = require('bigchaindb-driver');
const base58 = require('bs58');
const cryptoconditions = require('crypto-conditions');
const sha3 = require('js-sha3');
const API_PATH = 'https://test.bigchaindb.com/api/v1/'
const conn = new BigchainDB.Connection(API_PATH /*, {
  app_id: '21049ec1',
  app_key: '79a0c993f29ff4ba921ea724a112f6f6'
}*/);
const user1 = { privateKey: "DTotuBdRBcM1UvC6MtLW2G8gXDLyc4Qs8WEArmf95VMV", publicKey: "J8ZHPqCCcdvgfySPqX882RYK6o1ghYJGkTHSUePY5e1q"}; //new BigchainDB.Ed25519Keypair()
const user2 = { privateKey: "J8RyFH7UKxvo7eiejQkSiF5kWEbFyiX7vA4GuUTU8pTL", publicKey: "Dd4fBiWUe9FUC8WA53qmYcf4icW59jaaMDCXGDNiyqen"};
const user3 = { privateKey: "6ixNmhdEGkodWNsE2tYUTQDzTMcykwswhaa2hunaNudB", publicKey: "8Y4QQ2aQYuVV6eVRow8Kw5F4AnrsUjRdg1UjwME2m5ZL"};
const creator = { privateKey: "BQCwFVfU7BvPC1P9SYwTaSwwWfiVCzur6JKUZNs3m6nU", publicKey: "9veanEQsymeJRbwmZRhQZ1Hziyid1ruA9XBsZqkbuy5L"};
const receiver = { privateKey: "CH7Stqqftmtd2i8NipTFVj73HNuNa1JvnFdSmSCkWXWw", publicKey: "Gw1Qkyj1wrQKj59niRpW2rWKZMp5HcnoDD2ie6iHi5Xk"};
const alice = { privateKey: "7WrTwuAEGS2iDBaEqHxx9CFrR3TBmXZESTXyigoU7xCa", publicKey: "BWX6F78efHycQfU7VLKGGNzhc3GMxkwmwqedbBYJc3fY"};
const bob = { privateKey: "2bupkLmrgWfkZXrsFao2oDUDemQf7GdpTgPa71w811KE", publicKey: "21GuzGZ1tSwyvEMN93YpJCXe5H9GdEdbvYzNhjMHbLPX"};
const carly = { privateKey: "HHtvWosRJ4uFby4KcVPASFjRdUqgHs8r5DQCuYc6oWAF", publicKey: "7qnh1UBqVXz2YSNhuuT1mDZZUPxxx7r9VVdVn2qxz8Sp"};
const threshold = 2
const condition1 = BigchainDB.Transaction.makeEd25519Condition(user1.publicKey, false)
const condition2 = BigchainDB.Transaction.makeEd25519Condition(user2.publicKey, false)
const condition3 = BigchainDB.Transaction.makeEd25519Condition(user3.publicKey, false)
const condition4 = BigchainDB.Transaction.makeEd25519Condition(carly.publicKey, false);

const thresholdCondition = BigchainDB.Transaction.makeThresholdCondition(threshold, [condition1, condition2, condition3]);  // 2 of {user1, user2, user3}
const megaCondition = BigchainDB.Transaction.makeThresholdCondition(threshold, [thresholdCondition, condition4]); // both {Carly, and 2 of {user1, user2, user3}}
let txCreateAliceSimpleSigned;
let txSigned;
export default {
  name: 'App',
  components: {
    secureExchangeUi,
    tagDice
  },
  data: function() { 
    return {
      lastTransactionId: null,
      lastTransactionURI: null,
      rolls: [],
      betNames: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
      betOdds: [],
      betAmounts: [],
      userWin: '',
      userLoss: '',
      invoices: {},
      accountBalance: 0,
      bookieBalance: 0,
    }   
  },
  mounted: async function()
  {
    console.log(BigchainDB.Transaction.makeEd25519Condition(user1.publicKey));
    // at the output of the transaction to-be-spent
    // Generate threshold condition 2 out of 3

    console.log("thresholdCondition: ", thresholdCondition);
    console.log("mega condition: ", megaCondition);
    let output = BigchainDB.Transaction.makeOutput(megaCondition);
    output.public_keys = [user1.publicKey, user2.publicKey, user3.publicKey, carly.publicKey];

    const tx = BigchainDB.Transaction.makeCreateTransaction(
      {
        data: 'payload'
      }, 
      {
        metadata: 'test'
      }, 
      [output],
      creator.publicKey
    );
    // Sign the transaction with private keys
    txSigned = BigchainDB.Transaction.signTransaction(tx, creator.privateKey);

    // Send the transaction off to BigchainDB
    conn.postTransactionCommit(txSigned)
      .then(res => {
        console.log('Create Transaction', txSigned.id, 'accepted');
        this.lastTransactionURI = API_PATH + 'transactions/' + txSigned.id;
        this.lastTransactionId = txSigned.id;
        
        this.thresholdTransfer(txSigned, bob);
      });

    return;

    const txCreateAliceSimple = BigchainDB.Transaction.makeCreateTransaction(
      { 'asset': 'bicycle' },
      { 'purchase_price': '€240' },
      [
        BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(alice.publicKey))
      ],
      alice.publicKey
    );
    txCreateAliceSimpleSigned = BigchainDB.Transaction.signTransaction(txCreateAliceSimple, alice.privateKey);
    /* Send the transaction off to BigchainDB    */
    conn.postTransactionCommit(txCreateAliceSimpleSigned)
      .then(res => {
        console.log('Create Transaction', txCreateAliceSimpleSigned.id, 'accepted')
        this.lastTransactionURI = API_PATH + 'transactions/' + txCreateAliceSimpleSigned.id;
        this.lastTransactionId = txCreateAliceSimpleSigned.id;
      });
  },
  methods: {
    refreshOdds: function() {
      this.betNames.forEach((name, index) => { 
        this.betOdds[index] = Math.ceil(Math.random() * 100) / 10; 
        this.betAmounts[index] = 0;
      });
    },
    getConditions: function() {
      if(!this.lastTransactionId) return;
      conn.getTransaction(this.lastTransactionId).then(res => {
        console.log("transaction: ", res);
      }).catch(console.error);
    },
    sha256Hash: function(data) {
      return sha3.sha3_256
        .create()
        .update(data)
        .hex()
    },
    thresholdTransfer: async function(txSigned, receiver) {
        let createTranfer = BigchainDB.Transaction.makeTransferTransaction(
          [{
            tx: txSigned,
            output_index: 0
          }],
          [BigchainDB.Transaction.makeOutput(
            BigchainDB.Transaction.makeEd25519Condition(receiver.publicKey))],
          {
            what: "Transfer transaction"
          }
        );

        const serializedTransaction = BigchainDB.Transaction.serializeTransactionIntoCanonicalString(createTranfer)
        // at the input of the spending transaction
        let fulfillment1 = BigchainDB.Transaction.makeEd25519Condition(user1.publicKey, false)
        const transactionUniqueFulfillment1 = createTranfer.inputs[0].fulfills ? serializedTransaction
          .concat(createTranfer.inputs[0].fulfills.transaction_id)
          .concat(createTranfer.inputs[0].fulfills.output_index) : serializedTransaction
        const transactionHash1 = this.sha256Hash(transactionUniqueFulfillment1)
        fulfillment1.sign(Buffer.from(transactionHash1, 'hex'), new Buffer.from(base58.decode(user1.privateKey)))


        let fulfillment2 = BigchainDB.Transaction.makeEd25519Condition(user2.publicKey, false)
        const transactionUniqueFulfillment2 = createTranfer.inputs[0].fulfills ? serializedTransaction
          .concat(createTranfer.inputs[0].fulfills.transaction_id)
          .concat(createTranfer.inputs[0].fulfills.output_index) : serializedTransaction
        const transactionHash2 = this.sha256Hash(transactionUniqueFulfillment2)
        fulfillment2.sign(Buffer.from(transactionHash2, 'hex'), new Buffer.from(base58.decode(user2.privateKey)))

        // 2 out of 3 need to sign the fulfillment. Still condition3 is needed as the "circuit definition" is needed.
        // See https://github.com/bigchaindb/cryptoconditions/issues/94
        let fulfillment = new cryptoconditions.ThresholdSha256()
        fulfillment.threshold = 2
        fulfillment.addSubfulfillment(fulfillment1.serializeUri())
        fulfillment.addSubfulfillment(fulfillment2.serializeUri())
        fulfillment.addSubconditionUri(condition3.getConditionUri())

        
        let fulfillment4 = BigchainDB.Transaction.makeEd25519Condition(carly.publicKey, false)
        const transactionUniqueFulfillment4 = createTranfer.inputs[0].fulfills ? serializedTransaction
          .concat(createTranfer.inputs[0].fulfills.transaction_id)
          .concat(createTranfer.inputs[0].fulfills.output_index) : serializedTransaction
        const transactionHash4 = this.sha256Hash(transactionUniqueFulfillment4)
        fulfillment4.sign(Buffer.from(transactionHash4, 'hex'), new Buffer.from(base58.decode(carly.privateKey)));

        let megaFulfillment = new cryptoconditions.ThresholdSha256();
        megaFulfillment.threshold = 2;
        megaFulfillment.addSubfulfillment(fulfillment.serializeUri());
        megaFulfillment.addSubfulfillment(fulfillment4.serializeUri());

        //Sign the transaction
        const fulfillmentUri = fulfillment.serializeUri()
        createTranfer.inputs[0].fulfillment = megaFulfillment.serializeUri()//fulfillmentUri

        createTranfer.id = await this.sha256Hash(BigchainDB.Transaction.serializeTransactionIntoCanonicalString(createTranfer))

        conn.postTransactionCommit(createTranfer)
          .then(res => {
            console.log('Transfer Transaction', createTranfer.id, 'accepted')
          });
    },
    transfer: function() {
      // PreimageSha256 is anonymous condition. Fulfiller should guess what the condition is. 
      // Same as password. Whoever guesses it correctly can access it.
      // Useful when anyone should be given access with the right password.
      // For restricting only one particular person to guess the password, use ED25519 condition
      {
        const ps256Fulfillment = new cryptoconditions.PreimageSha256()
        ps256Fulfillment.setPreimage(new Buffer('Hello'));
        const result = cryptoconditions.validateFulfillment(ps256Fulfillment, ps256Fulfillment.getConditionUri()); // true
      }

      // ED25519 is condition that validates the person as well as the password.
      // Password should be correct, and it also it should come from the right person
      {
        const edPublicKey = new Buffer('ec172b93ad5e563bf4932c70e1245034c35467ef2efd4d64ebf819683467e2bf', 'hex');
        const edPrivateKey = new Buffer('833fe62409237b9d62ec77587520911e9a759cec1d19755b7da901b96dca3d42', 'hex');
        const ed25519Condition = new cryptoconditions.Ed25519Sha256();
        ed25519Condition.setPublicKey(edPublicKey);

        const ed25519Fulfillment = new cryptoconditions.Ed25519Sha256();
        ed25519Fulfillment.sign(new Buffer('password'), edPrivateKey);
        
        console.log(cryptoconditions.validateFulfillment(ed25519Fulfillment, ed25519Condition.getConditionUri(), new Buffer('password')));
      }
    },
    onRoll: function(value) {
      this.betNames.forEach((name, index) => { if(!this.betAmounts[index] || this.betAmounts[index]=="") this.betAmounts[index]  = 0; });
      const winIndex = value -1; // for zero-based indexing
      this.userWin = +(this.betAmounts[winIndex] * this.betOdds[winIndex]).toFixed(2);
      this.userLoss = +(this.betAmounts.reduce((total, amount) => { return total + amount; }) - this.betAmounts[winIndex]).toFixed(2);

      this.transferWinLossAmount();

      // prepare UI for next round
      // this.refreshOdds();
      if(this.rolls.length >= 5) this.rolls.shift();
      this.rolls.push(value);
    },
    transferWinLossAmount: function() {
      if(this.userLoss) { this.sendPayment(userAccount, userPwd, bookieAccount, this.userLoss, Date.now()); console.log("transfer out: ", this.userLoss); }
      if(this.userWin) { this.sendPayment(bookieAccount, bookiePwd, userAccount, this.userWin, Date.now());    console.log("transfer in: ", this.userWin); }
    },
    sendPayment: function(account, passphrase, recipient, amount, refNo) {
    },
    refreshBalance: function() {
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
<!--
  References:
    https://github.com/bigchaindb/project-jannowitz/blob/code-examples/js-examples/crypto-conditions.js
 -->