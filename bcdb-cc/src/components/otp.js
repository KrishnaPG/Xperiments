/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

const totp = require('otplib/totp');

export default {
	getNewToken: async function() {
		return totp.generate("Some Secret");
	}
};