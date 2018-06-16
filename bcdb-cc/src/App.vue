<template>
  <div id="app">
    <v-button @click="transfer">Transfer</v-button>
    <p>Last Transaction: <a :href="lastTransactionURI" target="_blank">{{lastTransactionId}}</a> </p>
    <hr>
    <secure-exchange-ui></secure-exchange-ui>
  </div>
</template>

<script>
import secureExchangeUi from '@/components/secure-exchange';
const Buffer = require('buffer').Buffer;
const BigchainDB = require('bigchaindb-driver');
const base58 = require('bs58');
const cryptoconditions = require('crypto-conditions');
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
    // Send the transaction off to BigchainDB
    conn.postTransactionCommit(txCreateAliceSimpleSigned)
      .then(res => {
        console.log('Create Transaction', txCreateAliceSimpleSigned.id, 'accepted')
        this.lastTransactionURI = API_PATH + 'transactions/' + txCreateAliceSimpleSigned.id;
        this.lastTransactionId = txCreateAliceSimpleSigned.id;
      });    
  },
  methods: {
    transfer: function() { /*
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

      // Because the addition of crypto conditions, the id for the transaction has to be regenerated
      delete createTranfer.id
      createTranfer.id = sha3.sha3_256
        .create()
        .update(BigchainDB.Transaction.serializeTransactionIntoCanonicalString(createTranfer))
        .hex();

      conn.postTransactionCommit(createTranfer)
        //.then(() => conn.pollStatusAndFetchTransaction(createTranfer.id))
        .then(res => {
          const transfTransaction = document.getElementById('transfTransaction')
          transfTransaction.href = API_PATH + 'transactions/' + createTranfer.id
          transfTransaction.innerText = createTranfer.id
          console.log('Transfer Transaction', createTranfer.id, 'accepted')
        })
        .catch(err => {
          console.log("Error [postTransactionCommit(createTranfer)]: ", err);
        })*/

      const txTransferBob = BigchainDB.Transaction.makeTransferTransaction(
        // signedTx to transfer and output index
        [{ tx: txCreateAliceSimpleSigned, output_index: 0 }],
        [BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(bob.publicKey))],
        // metadata
        { price: '100 euro' }
      )

      // Sign with alice's private key
      let txTransferBobSigned = BigchainDB.Transaction.signTransaction(txTransferBob, alice.privateKey)
      console.log('Posting signed transaction: ', txTransferBobSigned);

      conn.postTransactionCommit(txTransferBobSigned)
        //.then(() => conn.pollStatusAndFetchTransaction(createTranfer.id))
        .then(res => {
          console.log('Create Transaction', txTransferBobSigned.id, 'accepted')
          this.lastTransactionURI = API_PATH + 'transactions/' + txTransferBobSigned.id;
          this.lastTransactionId = txTransferBobSigned.id;
        })
        .catch(err => {
          console.log("Error [postTransactionCommit(createTranfer)]: ", err);
        })         
        return;

      // Create condition for Alice and Carly
      let subConditionFrom = BigchainDB.Transaction.makeEd25519Condition(alice.publicKey, false)
      let subConditionTo = BigchainDB.Transaction.makeEd25519Condition(carly.publicKey, false)

      // Create condition object with threshold and subconditions
      let condition = BigchainDB.Transaction.makeThresholdCondition(1, [subConditionFrom, subConditionTo])

      // Generate output with condition added
      let output = BigchainDB.Transaction.makeOutput(condition)

      // Add Carly to the output.public_keys field so she is the owner
      output.public_keys = [carly.publicKey]

      let transaction = BigchainDB.Transaction.makeTransferTransaction(
        [{ tx: txCreateAliceSimpleSigned, output_index: 0 }],
        [output],
        { 'meta': 'Transfer to new user with conditions' }
      );

      // Add alice as previous owner
      transaction.inputs[0].owners_before = [alice.publicKey]

      // Because the addition of crypto conditions, the id for the transaction has to be regenerated
      delete transaction.id
      transaction.id = sha3.sha3_256
        .create()
        .update(BigchainDB.Transaction.serializeTransactionIntoCanonicalString(transaction))
        .hex()

      // Alice has to sign this transfer because she is still the owner of the created asset
      let signedCryptoConditionTx = BigchainDB.Transaction.signTransaction(transaction, alice.privateKey);    
      conn.postTransactionCommit(signedCryptoConditionTx)
        //.then(() => conn.pollStatusAndFetchTransaction(createTranfer.id))
        .then(res => {
          console.log('Create Transaction', signedCryptoConditionTx.id, 'accepted')
          this.lastTransactionURI = API_PATH + 'transactions/' + signedCryptoConditionTx.id;
          this.lastTransactionId = signedCryptoConditionTx.id;
        })
        .catch(err => {
          console.log("Error [postTransactionCommit(createTranfer)]: ", err);
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