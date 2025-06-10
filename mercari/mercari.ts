import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import Bottleneck from "bottleneck";
import {
  MercariURLs,
  MercariSearchStatus,
  MercariSearchSort,
  MercariSearchOrder,
  MercariItemStatus,
  MercariItemConditionId,
  MercariSearchCategoryID,
} from "./types";
import { GenerateKeyPairResult } from "jose";
import {
  MercariSearchResult,
  MercariItem,
  MercariItemInfo,
  MercariSearchCondition,
} from "./types";
import { getHeadersWithDpop } from "./utils";
import { saveLog } from "../utils/saveLog";
import logger from "../utils/logger";

class MercariApi {
  uuid: string = "";
  key!: GenerateKeyPairResult;
  static _instance: MercariApi;
  private rateLimiter!: Bottleneck;

  constructor() {
    if (MercariApi._instance) {
      return MercariApi._instance;
    }

    // Initialize Bottleneck rate limiter
    this.rateLimiter = new Bottleneck({
      minTime: 60000 / 200, // 200 requests per minute
      maxConcurrent: 5,
      reservoir: 200, // Total number of requests allowed
      reservoirRefreshAmount: 200, // Refresh with full amount
      reservoirRefreshInterval: 60 * 1000, // Refresh every minute
    });

    MercariApi._instance = this;
    return this;
  }

  async refreshTokens(): Promise<this> {
    const { generateKeyPair } = await import("jose");
    this.uuid = uuidv4();
    this.key = await generateKeyPair("ES256", {
      crv: "P-256",
    });
    return this;
  }

  async getItemDetails(
    id: string,
    country_code = "VN"
  ): Promise<MercariItemInfo> {
    if (!id) throw new Error("Item id cannot be empty!");
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

    const data = await this.fetchMercari("GET", httpUrl, requestData);
    saveLog("logs/item_info.json", data);

    return data as MercariItemInfo;
  }

  async getItemTranslation(id: string): Promise<any> {
    if (!id) throw new Error("Item id cannot be empty!");
    const requestData = {
      name: id,
      sessionId: this.uuid,
    };
    const httpUrl = MercariURLs.TRANSLATION + id + "/translation";

    const data = await this.fetchMercari("GET", httpUrl, requestData);
    saveLog("logs/item_translation.json", data);
    return data;
  }

  async fetchMercari(
    httpMethod: string,
    httpUrl: string,
    requestData: any
  ): Promise<any> {
    // Use rate limiter to control API request frequency
    return this.rateLimiter.schedule(async () => {
      logger.log(
        `Making ${httpMethod} request to ${httpUrl} (inside rate limiter)`
      );
      
      try {
        // Generate headers inside the rate limiter to ensure they're fresh
        const headers = await getHeadersWithDpop(
          httpMethod,
          httpUrl,
          this.uuid,
          this.key
        );
        
        let response: Response | null = null;
        
        if (httpMethod === "POST") {
          response = await fetch(httpUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestData),
          });
        } else if (httpMethod === "GET") {
          const httpUrlWithParams = `${httpUrl}?${new URLSearchParams(
            requestData
          ).toString()}`;
          response = await fetch(httpUrlWithParams, {
            method: httpMethod,
            headers: headers,
          });
        }

        if (!response) {
          throw new Error("No response received from fetchMercari");
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            `Error while fetching: ${response.status} ${
              response.statusText
            } ${JSON.stringify(data)}`
          );
        }

        logger.log(
          `Successfully completed ${httpMethod} request to ${httpUrl}`
        );
        return data;
      } catch (error) {
        logger.error(`Failed ${httpMethod} request to ${httpUrl}:`, error);
        throw error;
      }
    });
  }

  async search(
    params: Partial<MercariSearchCondition> & {
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<MercariSearchResult> {
    const {
      keyword = "wacom",
      excludeKeyword = "",
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
      createdAfterDate = "0",
      createdBeforeDate = "0",
      pageSize = 120,
      pageToken = "",
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
      userId: "",
      pageSize,
      pageToken,
      searchSessionId: this.uuid,
      laplaceDeviceUuid: this.uuid,
      indexRouting: "INDEX_ROUTING_UNSPECIFIED",
      thumbnailTypes: [],
      searchCondition,
      defaultDatasets: [],
      serviceFrom: "suruga",
      source: "BaseSerp",
      withAuction: true,
      withItemBrand: true,
      withItemPromotions: true,
      useDynamicAttribute: true,
      withSuggestedItems: true,
      withOfferPricePromotion: true,
      withProductSuggest: true,
      withParentProducts: false,
      withProductArticles: true,
      withSearchConditionId: itemConditionId.length > 0,
    };

    // Debug logging
    saveLog("logs/request_debug.json", {
      searchCondition,
      requestData,
      uuid: this.uuid,
    });

    let data: MercariSearchResult = await this.fetchMercari(
      "POST",
      MercariURLs.SEARCH,
      requestData
    );

    data.items = data.items.filter((item: MercariItem) => {
      // Filter out items that are shop items
      return item.id.charAt(0) === "m";
    });

    saveLog("logs/search_results.json", data);
    return data;
  }

  /**
   * Get rate limiter statistics for monitoring
   */
  getRateLimiterStats() {
    return {
      running: this.rateLimiter.running(),
      queued: this.rateLimiter.queued(),
      empty: this.rateLimiter.empty(),
      config: {
        requestsPerMinute: 100,
        minTime: 60000 / 100,
      },
    };
  }
}

const mercariInstance = new MercariApi();
(async () => {
  await mercariInstance.refreshTokens();
})();
export default mercariInstance;
