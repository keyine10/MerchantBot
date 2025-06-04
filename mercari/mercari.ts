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
} from './types';
import { GenerateKeyPairResult } from 'jose';
import {
  MercariSearchResult,
  MercariItem,
  MercariItemInfo,
  MercariSearchCondition,
} from './types';
import { getHeadersWithDpop, fetchMercari } from './utils';

class MercariApi {
	uuid: string = '';
	key!: GenerateKeyPairResult;
	static _instance: MercariApi;

	constructor() {
		if (MercariApi._instance) {
			return MercariApi._instance;
		}
		MercariApi._instance = this;
		return this;
	}

	async refreshTokens(): Promise<this> {
		const { generateKeyPair } = await import('jose');
		this.uuid = uuidv4();
		this.key = await generateKeyPair('ES256', {
			crv: 'P-256',
		});
		return this;
	}

	async getItemDetails(id: string, country_code = 'VN'): Promise<MercariItemInfo> {
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

		const uuid = this.uuid || undefined;
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
			'logs/item_info.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data as MercariItemInfo;
	}

	async getItemTranslation(id: string): Promise<any> {
		if (!id) throw new Error('Item id cannot be empty!');
		const requestData = {
			name: id,
			sessionId: this.uuid,
		};
		const httpUrl = MercariURLs.TRANSLATION + id + '/translation';

		const uuid = this.uuid || undefined;
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
			'logs/item_translation.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data;
	}

	async search(params: Partial<MercariSearchCondition> & { pageSize?: number; pageToken?: string }): Promise<MercariSearchResult> {
		const {
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
			createdAfterDate = '0',
			createdBeforeDate = '0',
			pageSize = 120,
			pageToken = '',
		} = params;

		const searchCondition: MercariSearchCondition = {
			keyword,
			excludeKeyword,
			sort,
			order,
			status,
			sizeId,
			categoryId,
			brandId,
			sellerId,
			priceMin,
			priceMax,
			itemConditionId,
			shippingPayerId,
			shippingFromArea,
			shippingMethod,
			colorId,
			hasCoupon,
			attributes,
			itemTypes,
			skuIds,
			shopIds,
			promotionValidAt: null,
			excludeShippingMethodIds,
			createdAfterDate,
			createdBeforeDate,
		};
		const requestData = {
			userId: '',
			pageSize,
			pageToken,
			searchSessionId: this.uuid,
			laplaceDeviceUuid: this.uuid,
			indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
			thumbnailTypes: [],
			searchCondition,
			defaultDatasets: [],
			serviceFrom: 'suruga',
			withAuction: true,
			withItemBrand: true,
			withItemPromotions: false,
			useDynamicAttribute: true,
			withSuggestedItems: false,
			withOfferPricePromotion: false,
			withProductSuggest: false,
			withParentProducts: false,
			withProductArticles: true,
			withSearchConditionId: itemConditionId.length > 0 ? true : false,
		};
		console.log('running request:', requestData);
		const uuid = this.uuid;
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
			'logs/search_results.json',
			JSON.stringify(data, null, 2),
			'utf-8'
		);
		return data as MercariSearchResult;
	}
}

const mercariInstance = new MercariApi();
(async () => {
	await mercariInstance.refreshTokens();
})();
export default mercariInstance;
