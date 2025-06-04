"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercariSearchCategoryID = exports.MercariItemConditionId = exports.MercariItemStatus = exports.MercariSearchOrder = exports.MercariSearchSort = exports.MercariSearchStatus = exports.MercariURLs = void 0;
exports.generateDpop = generateDpop;
exports.getHeadersWithDpop = getHeadersWithDpop;
exports.fetchMercari = fetchMercari;
exports.MercariURLs = Object.freeze({
    ROOT: 'https://api.mercari.jp/',
    ROOT_PRODUCT: 'https://jp.mercari.com/en/item/',
    SEARCH: 'https://api.mercari.jp/v2/entities:search',
    ITEM_INFO: 'https://api.mercari.jp/items/get',
    USER_PROFILE: 'https://jp.mercari.com/en/user/profile/',
    TRANSLATION: 'https://api.mercari.jp/v2/itemtranslations/',
});
exports.MercariSearchStatus = Object.freeze({
    DEFAULT: 'STATUS_DEFAULT',
    ON_SALE: 'STATUS_ON_SALE',
    SOLD_OUT: 'STATUS_SOLD_OUT',
});
exports.MercariSearchSort = Object.freeze({
    DEFAULT: 'SORT_DEFAULT',
    CREATED_TIME: 'SORT_CREATED_TIME',
    NUM_LIKES: 'SORT_NUM_LIKES',
    SCORE: 'SORT_SCORE',
    PRICE: 'SORT_PRICE',
});
exports.MercariSearchOrder = Object.freeze({
    DESC: 'ORDER_DESC',
    ASC: 'ORDER_ASC',
});
exports.MercariItemStatus = Object.freeze({
    UNSPECIFIED: 'ITEM_STATUS_UNSPECIFIED',
    ON_SALE: 'ITEM_STATUS_ON_SALE',
    TRADING: 'ITEM_STATUS_TRADING',
    SOLD_OUT: 'ITEM_STATUS_SOLD_OUT',
    STOP: 'ITEM_STATUS_STOP',
    CANCEL: 'ITEM_STATUS_CANCEL',
    ADMIN_CANCEL: 'ITEM_STATUS_ADMIN_CANCEL',
});
exports.MercariItemConditionId = Object.freeze({
    NEW: 1,
    ALMOSTNEW: 2,
    NOSCRATCHES: 3,
    SMALLSCRATCHES: 4,
    SCRATCHED: 5,
    BAD: 6,
});
exports.MercariSearchCategoryID = Object.freeze({
    PHONES_TABLETS_COMPUTERS: 7,
    PC_PERIPHERALS: 841,
});
async function generateDpop(method, url, uuid, key) {
    const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
    if (!key) {
        key = await generateKeyPair('ES256', {
            crv: 'P-256',
        });
    }
    const { privateKey, publicKey } = key;
    const jwk = await exportJWK(publicKey);
    const headers = {
        typ: 'dpop+jwt',
        alg: 'ES256',
        jwk: jwk,
    };
    const payload = {
        htm: method,
        htu: url,
        jti: uuid,
        iat: Math.floor(Date.now() / 1000),
    };
    const dpopToken = await new SignJWT(payload)
        .setProtectedHeader(headers)
        .sign(privateKey);
    return dpopToken;
}
async function getHeadersWithDpop(httpMethod, httpUrl, uuid, key) {
    uuid = (uuid ?? crypto.randomUUID());
    const dpopToken = await generateDpop(httpMethod, httpUrl, uuid, key);
    return {
        DPOP: dpopToken,
        'X-Platform': 'web',
        Accept: '*/*',
        'Accept-Encoding': 'deflate, gzip',
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    };
}
async function fetchMercari(httpMethod, httpUrl, headers, requestData) {
    let response = null;
    if (httpMethod === 'POST')
        response = await fetch(httpUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestData),
        });
    else if (httpMethod === 'GET') {
        const httpUrlWithParams = `${httpUrl}?${new URLSearchParams(requestData).toString()}`;
        response = await fetch(httpUrlWithParams, {
            method: httpMethod,
            headers: headers,
        });
    }
    if (!response)
        throw new Error('No response received from fetchMercari');
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Error while fetching: ${response.status} ${response.statusText} ${JSON.stringify(data)}`, {});
    }
    return data;
}
