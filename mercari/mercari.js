const { v4: uuidv4 } = require('uuid'); // Import UUID generator
const fs = require('fs'); // Import the fs module
const {
	generateDpop,
	MercariURLs,
	MercariSearchStatus,
	MercariSearchSort,
	MercariSearchOrder,
	MercariItemStatus,
	MercariItemConditionId,
	MercariSearchCategoryID,
} = require('./utils.js'); // Import the generateDpop function
class MercariApi {
	constructor() {
		if (MercariApi._instance) {
			return MercariApi._instance;
		}
		this.uuid = null;
		this.key = null;
		MercariApi._instance = this;
		return this;
	}

	async init() {
		const { generateKeyPair } = await import('jose');
		this.uuid = uuidv4(); // Generate a new UUID for the instance
		this.key = await generateKeyPair('ES256', {
			crv: 'P-256',
		});
		return this;
	}

	async search({
		keyword = 'wacom',
		excludeKeyword = '',
		sort = MercariSearchSort.CREATED_TIME,
		order = MercariSearchOrder.DESC,
		status = [MercariSearchStatus.ON_SALE],
		sizeId = [],
		categoryId = [],
		brandId = [],
		sellerId = [],
		priceMin = 0,
		priceMax = 0,
		itemConditionId = [],
		shippingPayerId = [],
		shippingFromArea = [],
		shippingMethod = [],
		colorId = [],
		hasCoupon = false,
		attributes = [],
		itemTypes = [],
		skuIds = [],
		shopIds = [],
		excludeShippingMethodIds = [],
		pageSize = 120,
		pageToken = '',
	}) {
		const searchCondition = {
			keyword: keyword,
			excludeKeyword: excludeKeyword,
			sort: sort,
			order: order,
			status: status,
			sizeId: sizeId,
			categoryId: categoryId,
			brandId: brandId,
			sellerId: sellerId,
			priceMin: priceMin,
			priceMax: priceMax,
			itemConditionId: itemConditionId,
			shippingPayerId: shippingPayerId,
			shippingFromArea: shippingFromArea,
			shippingMethod: shippingMethod,
			colorId: colorId,
			hasCoupon: hasCoupon,
			attributes: attributes,
			itemTypes: itemTypes,
			skuIds: skuIds,
			shopIds: shopIds,
			excludeShippingMethodIds: excludeShippingMethodIds,
		};
		const requestData = {
			userId: '',
			pageSize: pageSize,
			pageToken: pageToken,
			searchSessionId: this.uuid,
			indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
			thumbnailTypes: [],
			searchCondition: searchCondition,
			defaultDatasets: [],
			serviceFrom: 'suruga',
			withAuction: true,
		};
		const dpopToken = await generateDpop(
			'POST',
			MercariURLs.SEARCH,
			this.uuid,
			this.key
		);

		const headers = {
			DPOP: dpopToken,
			'X-Platform': 'web',
			Accept: '*/*',
			'Accept-Encoding': 'deflate, gzip',
			'Content-Type': 'application/json; charset=utf-8',
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
		};
		try {
			const response = await fetch(MercariURLs.SEARCH, {
				method: 'POST', // Mercari's search API typically uses POST, not GET
				headers: headers,
				body: JSON.stringify(requestData), // Send requestData as JSON
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(
					`Error: ${response.status} ${response.statusText}`
				);
			}
			fs.writeFileSync(
				'search_results.json',
				JSON.stringify(data, null, 2),
				'utf-8'
			);
			return data;
		} catch (error) {
			console.error('Error making request:', error);
		}
	}
}

const mercariInstance = new MercariApi();
(async () => {
	await mercariInstance.init();
})();
module.exports = mercariInstance;
