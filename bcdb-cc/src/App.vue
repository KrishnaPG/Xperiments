<template>
  <div id="app">
    <v-button @click="transfer">Transfer</v-button>
    <p>Last Transaction: <a :href="lastTransactionURI" target="_blank">{{lastTransactionId}}</a> </p>
  </div>
</template>

<script>
const Buffer = require('buffer').Buffer;
const BigchainDB = require('bigchaindb-driver');
const base58 = require('bs58');
const cryptoconditions = require('crypto-conditions');
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
const threshold = 2
const condition1 = BigchainDB.Transaction.makeEd25519Condition(user1.publicKey, false)
const condition2 = BigchainDB.Transaction.makeEd25519Condition(user2.publicKey, false)
const condition3 = BigchainDB.Transaction.makeEd25519Condition(user3.publicKey, false)

const thresholdCondition = BigchainDB.Transaction.makeThresholdCondition(threshold, [condition1, condition2, condition3]);

let txSigned;
export default {
  name: 'App',
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
    output.public_keys = [user1.publicKey, user2.publicKey, user3.publicKey];

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
      })
  },
  methods: {
    transfer: function() {
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


      // at the input of the spending transaction
      let fulfillment1 = BigchainDB.Transaction.makeEd25519Condition(user1.publicKey, false)
      let fulfillment2 = BigchainDB.Transaction.makeEd25519Condition(user2.publicKey, false)
      fulfillment1.sign(
        new Buffer(BigchainDB.Transaction.serializeTransactionIntoCanonicalString(createTranfer)),
        new Buffer(base58.decode(user1.privateKey))
      );
      fulfillment2.sign(
        new Buffer(BigchainDB.Transaction.serializeTransactionIntoCanonicalString(createTranfer)),
        new Buffer(base58.decode(user2.privateKey))
      );

      // 2 out of 3 need to sign the fulfillment. Still condition3 is needed as the "circuit definition" is needed.
      // See https://github.com/bigchaindb/cryptoconditions/issues/94
      let fulfillment = new cryptoconditions.ThresholdSha256()
      fulfillment.threshold = 2
      fulfillment.addSubfulfillment(fulfillment1.serializeUri())
      fulfillment.addSubfulfillment(fulfillment2.serializeUri())
      fulfillment.addSubconditionUri(condition3.getConditionUri())

      //Sign the transaction
      const fulfillmentUri = fulfillment.serializeUri()
      createTranfer.inputs[0].fulfillment = fulfillmentUri

      conn.postTransactionCommit(createTranfer)
        //.then(() => conn.pollStatusAndFetchTransaction(createTranfer.id))
        .then(res => {
          const transfTransaction = document.getElementById('transfTransaction')
          transfTransaction.href = API_PATH + 'transactions/' + createTranfer.id
          transfTransaction.innerText = createTranfer.id
          console.log('Transfer Transaction', createTranfer.id, 'accepted')
        })      
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