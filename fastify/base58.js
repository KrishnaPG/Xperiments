/**
 * Copyright © 2019 Cenacle Research India Private Limited.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58 = require.main.require('base-x')(ALPHABET);

// pre-compute lookup table for decoding base58 into buffer
let ALPHABET_MAP = new Uint8Array(256);
ALPHABET_MAP = [
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, -1, -1, -1, -1, -1, -1,
	-1, 9, 10, 11, 12, 13, 14, 15, 16, -1, 17, 18, 19, 20, 21, -1,
	22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, -1, -1, -1, -1, -1,
	-1, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, -1, 44, 45, 46,
	47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
];
const INVALID_CHAR = -1;
const BASE = ALPHABET.length;
const LEADER = ALPHABET.charAt(0);
const SizeFactor = Math.log(BASE) / Math.log(256);

/**
 * Returns a base58 encoded string for the buffer
 */
Buffer.prototype.toBase58 = function() {
	return B58.encode(this);
}

/**
 * Loads the base58 encoded string into the buffer.
 * Fills the unused buffer with 0. Returns the no. of bytes filled.
 * The base-x version uses additional array and buffer to perform 
 * the decoding, which is not suitable for high performance operations.
 * This below method decodes into the current buffer without creating 
 * additional array or buffer. The caveat is that current buffer should
 * be large enough to hold the decoded byte content, which, once again,
 * for performance reasons we do not validate and just assume that the
 * buffer is large enough. If it is not, expect memory access errors and
 * handle them at the calling site.
 * Now, we seem to be having this generic sizeFactor = Math.log(BASE) / Math.log(256)
 * equation to estimate the required size of the buffer, but it seems not
 * accurate enough. For example, b58String = '5M' needs just one byte, but
 * the calculation suggests 2.4 bytes, throwing our test-cases into failure.
 * Hence we avoid that calculation and just hope that the caller knows what
 * they are doing with the buffer size. 
 * Of course, we could have monitored the decodedLen in the for and while 
 * loops below and bail-out when the size is crossing the available buffer
 * size. But that puts additional conditional checking overhead onto the
 * calculations, so we avoid that.
 * The tests in base58 folder ensure that for all valid range of values
 * of the buffer (between 0 and 255) this method works fine. Beyond that it is
 * up to the caller to ensure the buffer is large enough. Every ounce of performance matters.
 */
Buffer.prototype.loadBase58 = function (b58String) {
	this.fill(0);
	const strLen = b58String.length;
	if (strLen <= 0) return 0;

	const requiredBufSize = (strLen * SizeFactor) + 1;
	//if (this.length < requiredBufSize) throw new RangeError(`Buffer.loadBase58() Buffer not large enough. Required size: ${requiredBufSize}, available size: ${this.length}`)

	let decodedLen = 1;	
	for (let i = 0; i < strLen; i ++) {
		const value = ALPHABET_MAP[b58String.charCodeAt(i)];
		if (value === INVALID_CHAR) 
			throw new TypeError(`Invalid Base58 char: '${b58String[i]}' at position: ${i}`);
		let carry = value;
		for (let j = 0; j < decodedLen; j ++) {
			carry += this[j] * BASE;
			this[j] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			this[decodedLen++] = (carry & 0xff);
			carry >>= 8;
		}
	}
	// deal with leading zeros
	const lastStrIndex = b58String.length - 1;
	for (let k = 0; b58String[k] === LEADER && k < lastStrIndex; k ++) {
		decodedLen++;
	}
	// reverse the buffer content
	for (let i = 0, j = decodedLen - 1; i < j; ++i, --j) {
		const t = this[j];
		this[j] = this[i];
		this[i] = t;
	}
	return decodedLen;
}

module.exports = {};
module.exports.DecodeBufferSize = function(b58StringLen) {
	return (b58StringLen * SizeFactor) + 1;
}

/**
 * Creates a new buffer object from a base58 string. Allocates the required memory.
 * Use the `loadBase58` method on buffer instance to load the base58 string into 
 * an already allocated buffer.
 *
module.exports.BufferFromBase58 = function (b58String) {
	return B58.decode(b58String);
} */