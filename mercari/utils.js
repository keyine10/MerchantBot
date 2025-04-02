const MercariURLs = Object.freeze({
	ROOT: 'https://api.mercari.jp/',
	ROOT_PRODUCT: 'https://jp.mercari.com/en/item/',
	SEARCH: 'https://api.mercari.jp/v2/entities:search',
	ITEM_INFO: 'https://api.mercari.jp/items/get',
});

const MercariSearchStatus = Object.freeze({
	DEFAULT: 'STATUS_DEFAULT',
	ON_SALE: 'STATUS_ON_SALE',
	SOLD_OUT: 'STATUS_SOLD_OUT',
});

const MercariSearchSort = Object.freeze({
	DEFAULT: 'SORT_DEFAULT',
	CREATED_TIME: 'SORT_CREATED_TIME',
	NUM_LIKES: 'SORT_NUM_LIKES',
	SCORE: 'SORT_SCORE',
	PRICE: 'SORT_PRICE',
});

const MercariSearchOrder = Object.freeze({
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

const MercariItemConditionId = Object.freeze({
	NEW: 1,
	ALMOSTNEW: 2,
	NOSCRATCHES: 3,
	SMALLSCRATCHES: 4,
	SCRATCHED: 5,
	BAD: 6,
});
const MercariSearchCategoryID = Object.freeze({
	PHONES_TABLETS_COMPUTERS: 7,
	PC_PERIPHERALS: 841,
});

/**
 * Generates a DPoP (Demonstration of Proof-of-Possession) token for Mercari API requests.
 *
 * This function creates a signed JWT (JSON Web Token) with a DPoP header and payload,
 * which can be used to authenticate HTTP requests to the Mercari API.
 *
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {string} url - The HTTP URI (e.g., 'https://api.example.com/resource').
 * @param {string} [uuid=crypto.randomUUID()] - A unique identifier for the token (optional).
 * @param {{ privateKey: CryptoKey, publicKey: CryptoKey }} key - An object containing the private and public keys used for signing the JWT (optional).
 * @returns {Promise<string>} - A promise that resolves to the signed DPoP token as a string.
 */
async function generateDpop(
	method,
	url,
	uuid = crypto.randomUUID(),
	key
) {
	const { generateKeyPair, exportJWK, SignJWT } = await import(
		'jose'
	);
	// Generate a SECP256R1 (P-256) key pair
	if (!key) {
		key = await generateKeyPair('ES256', {
			crv: 'P-256', // Specify the curve as P-256 (SECP256R1)
		});
	}
	const { privateKey, publicKey } = key;
	// Convert the public key to JWK format
	const jwk = await exportJWK(publicKey);

	const headers = {
		typ: 'dpop+jwt',
		alg: 'ES256',
		jwk: jwk,
	};

	// DPoP payload
	const payload = {
		htm: method, // HTTP method (e.g., 'GET', 'POST')
		htu: url, // HTTP URI (e.g., 'https://api.example.com/resource')
		jti: uuid, // Unique identifier for the token
		iat: Math.floor(Date.now() / 1000), // Issued at time
	};
	// console.log('Payload:', payload);
	// Sign the JWT using the private key
	const dpopToken = await new SignJWT(payload)
		.setProtectedHeader(headers)
		.sign(privateKey);

	return dpopToken;
}

module.exports = {
	generateDpop,
	MercariURLs,
	MercariSearchStatus,
	MercariSearchSort,
	MercariSearchOrder,
	MercariItemStatus,
	MercariItemConditionId,
	MercariSearchCategoryID,
};
