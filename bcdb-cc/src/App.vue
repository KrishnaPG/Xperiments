<template>
  <div id="app">
    <!-- <v-button @click="transfer">Transfer</v-button> -->
    <p>Last Transaction:  Win: {{userWin}}  Loss:{{userLoss}}  Balance: {{accountBalance}}</p>
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
const ccSDK = new (require("codechain-sdk"))({ server: 'http://101.53.152.47:8080' });
const bookieAccount = "tccqzn9jjm3j6qg69smd7cn0eup4w7z2yu9my9a2k78";  // built-in test account that has lots of money
const bookiePwd = "satoshi";
const userAccount = "tccqzaa3x0jkh7w6lfz3nzrszupawdpxsljlsuv74yc";  // account of the user who is betting
const userPwd = "password";
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
    }   
  },
  mounted: function()
  {
    this.refreshOdds();
    this.refreshBalance();

    return;

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
    refreshOdds: function() {
      this.betNames.forEach((name, index) => { 
        this.betOdds[index] = Math.ceil(Math.random() * 100) / 10; 
        this.betAmounts[index] = 0;
      });
    },
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
      {
        const account ="tccqzaa3x0jkh7w6lfz3nzrszupawdpxsljlsuv74yc";
        const password ="password";

        ccSDK.rpc.account.getList().then(accounts => {
          accounts.forEach(element => {
            ccSDK.rpc.chain.getBalance(element).then(balance => console.log(`account ${element} has balance: ${balance}`));
          });
        });



        console.log("this: bet: ", this.betAmounts);
        //console.log("code chain address: ", ccSDK.key.classes.PlatformAddress.fromAccountId(account));
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
      const parcel = ccSDK.core.createPaymentParcel({ recipient,  amount });
      ccSDK.rpc.chain.sendParcel(parcel, {
        account,
        passphrase,
        nonce: Date.now()
      }).then(parcelHash => {
        return ccSDK.rpc.chain.getParcelInvoice(parcelHash, { timeout: 300 * 1000 });
      }).then(parcelInvoice => { console.log("invoice: refNo ", refNo);
        this.invoices[refNo] = parcelInvoice;
        this.refreshBalance();
      });
    },
    refreshBalance: function() {
      ccSDK.rpc.chain.getBalance(userAccount).then(balance => {
        // the balance is a U256 instance at this moment. Use toString() to print it out.
        this.accountBalance = balance.value;
        console.log("balance: ", balance.toString()); // the amount of CCC that the account has.
      });  
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