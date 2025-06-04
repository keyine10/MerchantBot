"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
class MercariApi {
    uuid = null;
    key;
    static _instance;
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
        this.uuid = (0, uuid_1.v4)();
        this.key = await generateKeyPair('ES256', {
            crv: 'P-256',
        });
        return this;
    }
    async getItemDetails(id, country_code = 'VN') {
        if (!id)
            throw new Error('Item id cannot be empty!');
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
        const httpUrl = utils_1.MercariURLs.ITEM_INFO;
        // Fix: Pass this.uuid as undefined if null
        const uuid = this.uuid ?? undefined;
        const headersWithDpop = await (0, utils_1.getHeadersWithDpop)('GET', httpUrl, uuid, this.key);
        const data = await (0, utils_1.fetchMercari)('GET', httpUrl, headersWithDpop, requestData);
        fs_1.default.writeFileSync('item_info.json', JSON.stringify(data, null, 2), 'utf-8');
        return data;
    }
    async getItemTranslation(id) {
        if (!id)
            throw new Error('Item id cannot be empty!');
        const requestData = {
            name: id,
            sessionId: this.uuid,
        };
        const httpUrl = utils_1.MercariURLs.TRANSLATION + id + '/translation';
        // Fix: Pass this.uuid as undefined if null
        const uuid = this.uuid ?? undefined;
        const headersWithDpop = await (0, utils_1.getHeadersWithDpop)('GET', httpUrl, uuid, this.key);
        const data = await (0, utils_1.fetchMercari)('GET', httpUrl, headersWithDpop, requestData);
        fs_1.default.writeFileSync('item_translation.json', JSON.stringify(data, null, 2), 'utf-8');
        return data;
    }
    async search({ keyword = 'wacom', excludeKeyword = '', sort = utils_1.MercariSearchSort.CREATED_TIME, order = utils_1.MercariSearchOrder.DESC, status = [utils_1.MercariSearchStatus.ON_SALE], sizeId = [], categoryId = [], brandId = [], sellerId = [], priceMin = 0, priceMax = 0, itemConditionId = [], shippingPayerId = [], shippingFromArea = [], shippingMethod = [], colorId = [], hasCoupon = false, attributes = [], itemTypes = [], skuIds = [], shopIds = [], excludeShippingMethodIds = [], pageSize = 120, pageToken = '', createdAfterDate = '0', createdBeforeDate = '0', }) {
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
            withSearchConditionId: itemConditionId.length > 0 ? true : false,
        };
        console.log('running request:', requestData);
        // Fix: Pass this.uuid as undefined if null
        const uuid = this.uuid ?? undefined;
        const headersWithDpop = await (0, utils_1.getHeadersWithDpop)('POST', utils_1.MercariURLs.SEARCH, uuid, this.key);
        const data = await (0, utils_1.fetchMercari)('POST', utils_1.MercariURLs.SEARCH, headersWithDpop, requestData);
        fs_1.default.writeFileSync('search_results.json', JSON.stringify(data, null, 2), 'utf-8');
        return data;
    }
}
const mercariInstance = new MercariApi();
(async () => {
    await mercariInstance.refreshTokens();
})();
exports.default = mercariInstance;
