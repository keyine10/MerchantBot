import mercariInstance from "../mercari/mercari";
import logger from "../utils/logger";
const requestData = {
  keyword: "wacom",
  excludeKeyword: "",
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
  createdAfterDate: "0",
  createdBeforeDate: "0",
  attributes: [],
  itemTypes: [],
  skuIds: [],
  shopIds: [],
  promotionValidAt: null,
  excludeShippingMethodIds: [],
};

async function test() {
  try {
    // Ensure tokens are refreshed before making the search
    logger.log("Refreshing tokens...");
    await mercariInstance.refreshTokens();
    logger.log(`UUID: ${mercariInstance.uuid}`);

    // Try with minimal parameters first
    logger.log("Making search request...");
    const searchResult = await mercariInstance.search({
      ...requestData,
      priceMin: 45,
      pageSize: 1200,
    });

    logger.log("Search successful!");
    console.log(JSON.stringify(searchResult.meta, null, 2));
  } catch (error) {
    logger.error("Test failed:", error);
    console.error("Full error:", error);
  }
}

test();
