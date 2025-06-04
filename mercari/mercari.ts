import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import {
	MercariURLs,
	MercariSearchStatus,
	MercariSearchSort,
	MercariSearchOrder,
	MercariItemStatus,
	MercariItemConditionId,
	MercariSearchCategoryID,
	getHeadersWithDpop,
	fetchMercari,
} from './utils';

class MercariApi {
	uuid: string | null = null;
	key: any;
	static _instance: MercariApi;

	constructor() {
		if (MercariApi._instance) {
			return MercariApi._instance;
		}
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

	async getItemDetails(id: string, country_code = 'VN') {
		if (!id) throw new Error('Item id cannot be empty!');
		const requestData = {
			id,
			include_item_attributes: true,
			include_product_page_component: true,
			include_non_ui_item_attributes: true,
			include_donation: true,
			include_offer_like_coupon_display: true,
			include_offer_coupon_display: true,
			include_item_attributes_sections: true,
			include_auction: true,
			country_code: country_code,
		};
		const httpUrl = MercariURLs.ITEM_INFO;

		// Fix: Pass this.uuid as undefined if null
		const uuid = this.uuid ?? undefined;
		const headersWithDpop = await getHeadersWithDpop(
			'GET',
			httpUrl,
			uuid,
			this.key
		);
		const data = await fetchMercari(
			'GET',
			httpUrl,
			headersWithDpop,
			requestData
		);
		fs.writeFileSync(
			'item_info.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data;
	}

	async getItemTranslation(id: string) {
		if (!id) throw new Error('Item id cannot be empty!');
		const requestData = {
			name: id,
			sessionId: this.uuid,
		};
		const httpUrl = MercariURLs.TRANSLATION + id + '/translation';

		// Fix: Pass this.uuid as undefined if null
		const uuid = this.uuid ?? undefined;
		const headersWithDpop = await getHeadersWithDpop(
			'GET',
			httpUrl,
			uuid,
			this.key
		);
		const data = await fetchMercari(
			'GET',
			httpUrl,
			headersWithDpop,
			requestData
		);
		fs.writeFileSync(
			'item_translation.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data;
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
		createdAfterDate = '0',
		createdBeforeDate = '0',
	}: any) {
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
		// Fix: Pass this.uuid as undefined if null
		const uuid = this.uuid ?? undefined;
		const headersWithDpop = await getHeadersWithDpop(
			'POST',
			MercariURLs.SEARCH,
			uuid,
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
export default mercariInstance;
