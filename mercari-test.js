const { v4: uuidv4 } = require('uuid'); // Import UUID generator
const fs = require('fs');
const { generateDpop } = require('./mercari/utils'); // Import the generateDpop function
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

const searchCondition = {
	keyword: 'wacom',
	excludeKeyword: '',
	sort: 'SORT_SCORE',
	order: 'ORDER_DESC',
	status: [],
	sizeId: [],
	categoryId: [],
	brandId: [],
	sellerId: [],
	priceMin: 0,
	priceMax: 0,
	itemConditionId: [],
	shippingPayerId: [],
	shippingFromArea: [],
	shippingMethod: [],
	colorId: [],
	hasCoupon: false,
	attributes: [],
	itemTypes: [],
	skuIds: [],
	shopIds: [],
	excludeShippingMethodIds: [],
};

const requestData = {
	userId: '',
	pageSize: 15,
	pageToken: '',
	searchSessionId: uuidv4(),
	indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
	thumbnailTypes: [],
	searchCondition: searchCondition,
	defaultDatasets: [],
	serviceFrom: 'suruga',
	withAuction: true,
};

(async () => {
	try {
		// Generate the DPoP token
		const dpopToken = await generateDpop(
			'POST',
			MercariURLs.SEARCH
		);

		// Define headers
		const headers = {
			DPOP: dpopToken,
			'X-Platform': 'web',
			Accept: '*/*',
			'Accept-Encoding': 'deflate, gzip',
			'Content-Type': 'application/json; charset=utf-8',
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
		};

		// Make the GET request
		const response = await fetch(MercariURLs.SEARCH, {
			method: 'POST', // Mercari's search API typically uses POST, not GET
			headers: headers,
			body: JSON.stringify(requestData), // Send requestData as JSON
		});

		const data = await response.json();
		console.log('Search Results:', data.meta);
		fs.writeFileSync(
			'search_results.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		console.log(data.items.length);
	} catch (error) {
		console.error('Error making request:', error);
	}
})();

module.exports = {
	MercariURLs,
	MercariSearchStatus,
	MercariSort,
	MercariOrder,
	MercariItemStatus,
};
