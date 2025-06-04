type MercariItemPhoto = {
    uri: string;
};

type MercariItemBrand = {
    id: string;
    name: string;
    subName: string;
} | null;

type MercariItemTranslation = {
    name: string;
    description: string;
}

type MercariItemInfo = {
    result: string;
    data: {
        id: string;
        seller: {
            id: string;
            name: string;
            photo_url: string;
            photo_thumbnail_url: string;
            register_sms_confirmation: string;
            register_sms_confirmation_at: string;
            created: number;
            num_sell_items: number;
            ratings: {
                good: number;
                normal: number;
                bad: number;
            };
            num_ratings: number;
            score: number;
            is_official: boolean;
            quick_shipper: boolean;
            is_followable: boolean;
            is_blocked: boolean;
            star_rating_score: number;
        };
        converted_price: {
            price: number;
            currency_code: string;
            rate_updated: number;
        };
        status: MercariItemStatus;
        name: string;
        price: number;
        description: string;
        photos: MercariItemPhoto[];
        photo_paths: string[];
        thumbnails: string[];
        item_category: {
            id: MercariSearchCategoryID | number;
            name: string;
            display_order: number;
            parent_category_id: number;
            parent_category_name: string;
            root_category_id: number;
            root_category_name: string;
            brand_group_id: number;
        };
        item_category_ntiers: {
            id: MercariSearchCategoryID | number;
            name: string;
            display_order: number;
            parent_category_id: number;
            parent_category_name: string;
            root_category_id: number;
            root_category_name: string;
            brand_group_id: number;
        };
        parent_categories_ntiers: {
            id: MercariSearchCategoryID | number;
            name: string;
            display_order: number;
        }[];
        item_condition: {
            id: MercariItemConditionId;
            name: string;
            subname: string;
        };
        colors: string[];
        shipping_payer: {
            id: number;
            name: string;
            code: string;
        };
        shipping_method: {
            id: number;
            name: string;
            is_deprecated: string;
        };
        shipping_from_area: {
            id: number;
            name: string;
        };
        shipping_duration: {
            id: number;
            name: string;
            min_days: number;
            max_days: number;
        };
        shipping_class: {
            id: number;
            fee: number;
            icon_id: number;
            pickup_fee: number;
            shipping_fee: number;
            total_fee: number;
            is_pickup: boolean;
        };
        num_likes: number;
        num_comments: number;
        registered_prices_count: number;
        comments: Record<string, unknown>[];
        updated: number;
        created: number;
        pager_id: number;
        liked: boolean;
        checksum: string;
        is_dynamic_shipping_fee: boolean;
        application_attributes: Record<string, unknown>;
        is_shop_item: string;
        hash_tags: string[];
        is_anonymous_shipping: boolean;
        is_web_visible: boolean;
        is_offerable: boolean;
        is_organizational_user: boolean;
        organizational_user_status: string;
        is_stock_item: boolean;
        is_cancelable: boolean;
        shipped_by_worker: boolean;
        additional_services: Record<string, unknown>[];
        has_additional_service: boolean;
        has_like_list: boolean;
        is_offerable_v2: boolean;
        item_attributes: {
            id: string;
            text: string;
            values: {
                id: string;
                text: string;
            }[];
            deep_facet_filterable: boolean;
            show_on_ui: boolean;
        }[];
        is_dismissed: boolean;
        photo_descriptions: string[];
        meta_title: string;
        meta_subtitle: string;
    };
    meta: Record<string, unknown>;
};

type MercariItem = {
    id: string;
    sellerId: string;
    buyerId: string;
    status: MercariItemStatus;
    name: string;
    price: string;
    created: string;
    updated: string;
    thumbnails: string[];
    itemType: string;
    itemConditionId: MercariItemConditionId;
    shippingPayerId: string;
    itemSizes: Record<string, unknown>[];
    itemBrand: MercariItemBrand;
    itemPromotions: Record<string, unknown>[];
    shopName: string;
    itemSize: Record<string, unknown> | null;
    shippingMethodId: string;
    categoryId: MercariSearchCategoryID | string;
    isNoPrice: boolean;
    title: string;
    isLiked: boolean;
    photos: MercariItemPhoto[];
    auction: Record<string, unknown> | null;
};

type MercariSearchMeta = {
    nextPageToken: string;
    previousPageToken: string;
    numFound: string;
    properties: Record<string, unknown>[];
};

type MercariSearchCondition = {
    keyword: string;
    excludeKeyword: string;
    sort: MercariSearchSort;
    order: MercariSearchOrder;
    status: MercariSearchStatus[];
    sizeId: string[];
    categoryId: (MercariSearchCategoryID | string)[];
    brandId: string[];
    sellerId: string[];
    priceMin: number;
    priceMax: number;
    itemConditionId: MercariItemConditionId[];
    shippingPayerId: string[];
    shippingFromArea: string[];
    shippingMethod: string[];
    colorId: string[];
    hasCoupon: boolean;
    createdAfterDate: string;
    createdBeforeDate: string;
    attributes: Record<string, unknown>[];
    itemTypes: string[];
    skuIds: string[];
    shopIds: string[];
    promotionValidAt: string | null;
    excludeShippingMethodIds: string[];
};

type MercariSearchResult = {
    meta: MercariSearchMeta;
    items: MercariItem[];
    components: Record<string, unknown>[];
    searchCondition: MercariSearchCondition;
    searchConditionId: string;
};

export type {
    MercariItemInfo,
    MercariItem,
    MercariSearchMeta,
    MercariItemBrand,
    MercariItemPhoto,
    MercariSearchCondition,
    MercariSearchResult,
    MercariItemTranslation
};

export enum MercariURLs {
    ROOT = 'https://api.mercari.jp/',
    ROOT_PRODUCT = 'https://jp.mercari.com/en/item/',
    SEARCH = 'https://api.mercari.jp/v2/entities:search',
    ITEM_INFO = 'https://api.mercari.jp/items/get',
    USER_PROFILE = 'https://jp.mercari.com/en/user/profile/',
    TRANSLATION = 'https://api.mercari.jp/v2/itemtranslations/',
}

export enum MercariSearchStatus {
    DEFAULT = 'STATUS_DEFAULT',
    ON_SALE = 'STATUS_ON_SALE',
    SOLD_OUT = 'STATUS_SOLD_OUT',
}

export enum MercariSearchSort {
    DEFAULT = 'SORT_DEFAULT',
    CREATED_TIME = 'SORT_CREATED_TIME',
    NUM_LIKES = 'SORT_NUM_LIKES',
    SCORE = 'SORT_SCORE',
    PRICE = 'SORT_PRICE',
}

export enum MercariSearchOrder {
    DESC = 'ORDER_DESC',
    ASC = 'ORDER_ASC',
}

export enum MercariItemStatus {
    UNSPECIFIED = 'ITEM_STATUS_UNSPECIFIED',
    ON_SALE = 'ITEM_STATUS_ON_SALE',
    TRADING = 'ITEM_STATUS_TRADING',
    SOLD_OUT = 'ITEM_STATUS_SOLD_OUT',
    STOP = 'ITEM_STATUS_STOP',
    CANCEL = 'ITEM_STATUS_CANCEL',
    ADMIN_CANCEL = 'ITEM_STATUS_ADMIN_CANCEL',
}

export enum MercariItemConditionId {
    NEW = 1,
    ALMOSTNEW = 2,
    NOSCRATCHES = 3,
    SMALLSCRATCHES = 4,
    SCRATCHED = 5,
    BAD = 6,
}

export enum MercariSearchCategoryID {
    PHONES_TABLETS_COMPUTERS = 7,
    PC_PERIPHERALS = 841,
}