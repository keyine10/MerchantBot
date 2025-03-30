const MercariURLs = Object.freeze({
	ROOT: 'https://api.mercari.jp/',
	ROOT_PRODUCT: 'https://jp.mercari.com/item/',
	SEARCH: 'https://api.mercari.jp/v2/entities:search',
	ITEM_INFO: 'https://api.mercari.jp/items/get',
});

const MercariSearchStatus = Object.freeze({
	DEFAULT: 'STATUS_DEFAULT',
	ON_SALE: 'STATUS_ON_SALE',
	SOLD_OUT: 'STATUS_SOLD_OUT',
});

const MercariSort = Object.freeze({
	DEFAULT: 'SORT_DEFAULT',
	CREATED_TIME: 'SORT_CREATED_TIME',
	NUM_LIKES: 'SORT_NUM_LIKES',
	SCORE: 'SORT_SCORE',
	PRICE: 'SORT_PRICE',
});

const MercariOrder = Object.freeze({
	DESC: 'ORDER_DESC',
	ASC: 'ORDER_ASC',
});

const MercariItemStatus = Object.freeze({
	UNSPECIFIED: 'ITEM_STATUS_UNSPECIFIED',
	ON_SALE: 'ITEM_STATUS_ON_SALE',
	TRADING: 'ITEM_STATUS_TRADING',
	SOLD_OUT: 'ITEM_STATUS_SOLD_OUT',
	STOP: 'ITEM_STATUS_STOP',
	CANCEL: 'ITEM_STATUS_CANCEL',
	ADMIN_CANCEL: 'ITEM_STATUS_ADMIN_CANCEL',
});

// const jwt = require('jsonwebtoken');
const crypto = require('crypto');

async function generateDpop(httpMethod, httpUri) {
	const { generateKeyPair, exportJWK, SignJWT } = await import(
		'jose'
	);
	// Generate a SECP256R1 (P-256) key pair
	const { privateKey, publicKey } = await generateKeyPair('ES256', {
		crv: 'P-256', // Specify the curve as P-256 (SECP256R1)
	});

	// Convert the public key to JWK format
	const jwk = await exportJWK(publicKey);

	const headers = {
		typ: 'dpop+jwt',
		alg: 'ES256',
		jwk: jwk,
	};

	// DPoP payload
	const payload = {
		htm: httpMethod, // HTTP method (e.g., 'GET', 'POST')
		htu: httpUri, // HTTP URI (e.g., 'https://api.example.com/resource')
		jti: crypto.randomUUID(), // Unique identifier for the token
		iat: Math.floor(Date.now() / 1000), // Issued at time
	};

	// Sign the JWT using the private key
	const dpopToken = await new SignJWT(payload)
		.setProtectedHeader(headers)
		.sign(privateKey);

	return { dpopToken, publicKey };
}

// Example usage
(async () => {
	const { dpopToken, publicKey } = await generateDpop(
		'GET',
		'https://api.mercari.jp/items/get'
	);
	console.log('DPoP Token:', dpopToken);
	console.log('Public Key:', publicKey);
})();

module.exports = {
	MercariURLs,
	MercariSearchStatus,
	MercariSort,
	MercariOrder,
	MercariItemStatus,
	generateDpop,
};
