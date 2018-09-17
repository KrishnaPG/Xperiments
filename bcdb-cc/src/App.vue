<template>
  <div id="app">
    <v-button @click="transfer">Transfer</v-button>
    <p>Last Transaction: <a :href="lastTransactionURI" target="_blank">{{lastTransactionId}}</a> </p>
    <hr>
    <!-- <secure-exchange-ui></secure-exchange-ui> -->
  </div>
</template>

<script>
import secureExchangeUi from '@/components/secure-exchange';
const Buffer = require('buffer').Buffer;
const BigchainDB = require('bigchaindb-driver');
const base58 = require('bs58');
const cc = require('crypto-conditions');
const sha3 = require('js-sha3');
const API_PATH = 'https://test.bigchaindb.com/api/v1/'
const conn = new BigchainDB.Connection(API_PATH, {
  app_id: '21049ec1',
  app_key: '79a0c993f29ff4ba921ea724a112f6f6'
});
const user1 = new BigchainDB.Ed25519Keypair()
const user2 = new BigchainDB.Ed25519Keypair()
const user3 = new BigchainDB.Ed25519Keypair()
const creator = new BigchainDB.Ed25519Keypair()
const receiver = new BigchainDB.Ed25519Keypair();
const alice = new BigchainDB.Ed25519Keypair();
const bob = new BigchainDB.Ed25519Keypair();
const carly = new BigchainDB.Ed25519Keypair();
const threshold = 2
const condition1 = BigchainDB.Transaction.makeEd25519Condition(user1.publicKey, false)
const condition2 = BigchainDB.Transaction.makeEd25519Condition(user2.publicKey, false)
const condition3 = BigchainDB.Transaction.makeEd25519Condition(user3.publicKey, false)

const thresholdCondition = BigchainDB.Transaction.makeThresholdCondition(threshold, [condition1, condition2, condition3]);
let txCreateAliceSimpleSigned;
let txSigned;
export default {
  name: 'App',
  components: {
    secureExchangeUi
  },
  data: function() { 
    return {
      lastTransactionId: null,
      lastTransactionURI: null
    }   
  },
  mounted: function()
  {


    console.log(BigchainDB.Transaction.makeEd25519Condition(user1.publicKey))
    // at the output of the transaction to-be-spent
    // Generate threshold condition 2 out of 3

    console.log(thresholdCondition)
    let output = BigchainDB.Transaction.makeOutput(thresholdCondition);
    output.public_keys = [user1.publicKey, user2.publicKey, user3.publicKey];/*

    const tx = BigchainDB.Transaction.makeCreateTransaction({
      data: 'payload'
    }, {
        metadata: 'test'
      }, [output],
      creator.publicKey
    )
    // Sign the transaction with private keys
    txSigned = BigchainDB.Transaction.signTransaction(tx, creator.privateKey)

    // Send the transaction off to BigchainDB
    conn.postTransactionCommit(txSigned)
      .then(res => {
        console.log('Create Transaction', txSigned.id, 'accepted')
        this.lastTransactionURI = API_PATH + 'transactions/' + txSigned.id;
        this.lastTransactionId = txSigned.id;
      });*/

    const txCreateAliceSimple = BigchainDB.Transaction.makeCreateTransaction(
      { 'asset': 'bicycle' },
      { 'purchase_price': '€240' },
      [
        BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(alice.publicKey))
      ],
      alice.publicKey
    );
    txCreateAliceSimpleSigned = BigchainDB.Transaction.signTransaction(txCreateAliceSimple, alice.privateKey);
    /* Send the transaction off to BigchainDB
    conn.postTransactionCommit(txCreateAliceSimpleSigned)
      .then(res => {
        console.log('Create Transaction', txCreateAliceSimpleSigned.id, 'accepted')
        this.lastTransactionURI = API_PATH + 'transactions/' + txCreateAliceSimpleSigned.id;
        this.lastTransactionId = txCreateAliceSimpleSigned.id;
      });    */
  },
  methods: {
    transfer: function() {
      // PreimageSha256 is anonymous condition. Fulfiller should guess what the condition is. 
      // Same as password. Whoever guesses it correctly can access it.
      // Useful when anyone should be given access with the right password.
      // For restricting only one particular person to guess the password, use ED25519 condition
      {
        const ps256Fulfillment = new cc.PreimageSha256()
        ps256Fulfillment.setPreimage(new Buffer('Hello'));
        const result = cc.validateFulfillment(ps256Fulfillment, ps256Fulfillment.getConditionUri()); // true
      }

      // ED25519 is condition that validates the person as well as the password.
      // Password should be correct, and it also it should come from the right person
      {
        const edPublicKey = new Buffer('ec172b93ad5e563bf4932c70e1245034c35467ef2efd4d64ebf819683467e2bf', 'hex');
        const edPrivateKey = new Buffer('833fe62409237b9d62ec77587520911e9a759cec1d19755b7da901b96dca3d42', 'hex');
        const ed25519Condition = new cc.Ed25519Sha256();
        ed25519Condition.setPublicKey(edPublicKey);

        const ed25519Fulfillment = new cc.Ed25519Sha256();
        ed25519Fulfillment.sign(new Buffer('password'), edPrivateKey);
        
        console.log(cc.validateFulfillment(ed25519Fulfillment, ed25519Condition.getConditionUri(), new Buffer('password')));
      }
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