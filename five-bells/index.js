
const ccSDK = new (require("codechain-sdk"))({ server: 'http://101.53.152.47:8080' });

const secret = "ede1d4ccb4ec9a8bbbae9a13db3f4a7b56ea04189be86ac3a6a439d9a0a1addd";
const passphrase = "satoshi";

ccSDK.rpc.account.importRaw(secret, passphrase).then(function (account) {
	console.log(account); // tccqzaa3x0jkh7w6lfz3nzrszupawdpxsljlsuv74yc
});

return; 

ccSDK.rpc.chain.getBestBlockNumber().then(function (num) {
	console.log("Best Block Number: ", num);
});

const pk = ccSDK.util.generatePrivateKey();
console.log("Your secret:", pk);

const account = ccSDK.util.getAccountIdFromPrivate(pk);
const address = ccSDK.key.classes.PlatformAddress.fromAccountId(account);
console.log("Your CodeChain address:", address.toString());

ccSDK.rpc.chain.getBalance(address).then(function (balance) {
	// the balance is a U256 instance at this moment. Use toString() to print it out.
	console.log("Balance in Account: ", balance.toString()); // the amount of CCC that the account has.
});

// ccSDK.rpc.account.importRaw(secret, passphrase).then(function (account) {
// 	console.log(account); // tccqzn9jjm3j6qg69smd7cn0eup4w7z2yu9my9a2k78
// });

return;

const cc = require('five-bells-condition')

// Check a condition for validity
let condition = 'ni:///sha-256;47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU?fpt=preimage-sha-256&cost=0'
let validationResult = cc.validateCondition(condition)

const fulfillment1 = new cc.PreimageSha256();
fulfillment1.setPreimage(new Buffer('123456789123456789123456789'));
const fulfillment2 = new cc.PreimageSha256();
fulfillment2.setPreimage(new Buffer('BBB'));

condition = fulfillment1.getConditionUri();
console.log("condition: ", condition);
console.log("validation Result for AAA: ", cc.validateFulfillment(fulfillment1, condition));

const edPrivateKey = new Buffer('833fe62409237b9d62ec77587520911e9a759cec1d19755b7da901b96dca3d42', 'hex')
const ed25519Fulfillment = new cc.Ed25519Sha256()
const edMessage = new Buffer('Hello World! Conditions are here!');
ed25519Fulfillment.sign(edMessage, edPrivateKey);
const edCondition = ed25519Fulfillment.getConditionUri();
console.log("edCondition: ", edCondition);
console.log("validation Result for edMessage: ", cc.validateFulfillment(ed25519Fulfillment, edCondition, edMessage));

//console.log("validation Result for BBB: ", cc.validateFulfillment('BBB', condition));
/*
const fulfillment = 'oAKAAAoAKAAA'
validationResult = cc.validateFulfillment(fulfillment, condition);
console.log("validation Result = ", validationResult);



const thresholdFulfillment = new cc.ThresholdSha256()
thresholdFulfillment.addSubconditionUri('ni:///sha-256;U1YhFdW0lOI-SVF3PbDP4t_lVefj_-tB5P11yvfBaoE?fpt=ed25519-sha-256&cost=131072')
thresholdFulfillment.addSubfulfillmentUri('oAKAAA')
thresholdFulfillment.setThreshold(1) // defaults to subconditions.length
console.log(thresholdFulfillment.getConditionUri())

const thresholdFulfillment = new cc.ThresholdSha256()
thresholdFulfillment.addSubfulfillmentUri('pGSAIOwXK5OtXlY79JMscOEkUDTDVGfvLv1NZOv4GWg0Z-K_gUC2IpH62UMvjymLnEpIldvik_b_2hpo2t8Mze9fR6DHISpf6jzal6P0wD6p8uisHOyGpR1FISer26CdG28zHAcK')
thresholdFulfillment.addSubfulfillmentUri('oAKAAA')
thresholdFulfillment.setThreshold(1) // defaults to subconditions.length
console.log(thresholdFulfillment.getConditionUri())
// prints 'ni:///sha-256;l-wuy18t5Ic2GfCbVb9yAiTJ_gJbN2x34fk3eHOz5kY?fpt=threshold-sha-256&cost=133120&subtypes=ed25519-sha-256,preimage-sha-256'
const thresholdFulfillmentUri = thresholdFulfillment.serializeUri()
// Note: If there are more than enough fulfilled subconditions, shorter
// fulfillments will be chosen over longer ones.
// thresholdFulfillmentUri.length === 68
console.log(thresholdFulfillmentUri)
*/