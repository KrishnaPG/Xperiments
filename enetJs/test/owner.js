/**********************************************************
 * Copyright © 2020 Cenacle Research India Private Limited.
 * All Rights Reserved.
 */
const atExit = require('exit-hook');
const Discovery = require('@hyperswarm/discovery');
const MultiBase = require('multibase');
const Sodium = require('sodium-native');

/* 
// generate new key-pair
const pubKeyBuf = Buffer.alloc(Sodium.crypto_sign_PUBLICKEYBYTES);
const secKeyBuf = Buffer.alloc(Sodium.crypto_sign_SECRETKEYBYTES);
Sodium.crypto_sign_keypair(pubKeyBuf, secKeyBuf); 
console.log("pubKey: ", pubKeyBuf.toString("hex"), ", secKey: ", secKeyBuf.toString("hex"));
*/

const pubKeyBuf = Buffer.from("1696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");
const secKeyBuf = Buffer.from("d5b2af6cd97a721d24784ce843ef31ee3a566066aa4505364e828cbdef5149281696a0b9268596cc1d9257e6e49715aa0999a7ce1fc86b04e209f966d097c08d", "hex");

const announceKey = MultiBase.encode("base58btc", pubKeyBuf).toString(); console.log("announcing: ", announceKey, " buf: ", pubKeyBuf);

const d = Discovery();
const topic = d.announce(pubKeyBuf, { port: 12345, lookup: true });
topic.once('close', () => console.log("unAnnounced and topic closed"));

atExit(() => {
	topic.destroy(); // un-announce the key	
	d.destroy(); // free the resources (also destroys all topics)
});
