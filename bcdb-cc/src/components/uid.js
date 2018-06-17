/**
 *	Copyright 2018. Cenacle Research India Private Limited.
 **/

const UUIDV4 = require('uuid/v4');

export default {
	randomID: function () {
		return UUIDV4().slice(0, 18);
	}
}