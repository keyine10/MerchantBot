const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const {
	MercariURLs,
	MercariSearchStatus,
	MercariSearchSort,
	MercariSearchOrder,
	MercariItemStatus,
	MercariItemConditionId,
	MercariSearchCategoryID,
	getHeadersWithDpop,
	fetchMercari,
} = require('./utils.js');
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

	async refreshTokens() {
		const { generateKeyPair } = await import('jose');
		this.uuid = uuidv4();
		this.key = await generateKeyPair('ES256', {
			crv: 'P-256',
		});
		return this;
	}

	async getItemDetails({}) {}

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
		createdAfterDate = '0',
		createdBeforeDate = '0',
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
			createdAfterDate,
			createdBeforeDate,
		};
		const requestData = {
			userId: '',
			pageSize: pageSize,
			pageToken: pageToken,
			searchSessionId: this.uuid,
			laplaceDeviceUuid: this.uuid,
			indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
			thumbnailTypes: [],
			searchCondition: searchCondition,
			defaultDatasets: [],
			serviceFrom: 'suruga',
			withAuction: true,
			withItemBrand: true,
			withItemPromotions: true,
			useDynamicAttribute: true,
			withSuggestedItems: true,
			withOfferPricePromotion: true,
			withProductSuggest: true,
			withParentProducts: false,
			withProductArticles: true,
			withSearchConditionId:
				itemConditionId.length > 0 ? true : false,
		};
		console.log('running request:', requestData);
		const headersWithDpop = await getHeadersWithDpop(
			'POST',
			MercariURLs.SEARCH,
			this.uuid,
			this.key
		);

		const data = await fetchMercari(
			'POST',
			MercariURLs.SEARCH,
			headersWithDpop,
			requestData
		);

		fs.writeFileSync(
			'search_results.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data;
	}
}

const mercariInstance = new MercariApi();
(async () => {
	await mercariInstance.refreshTokens();
})();
module.exports = mercariInstance;
