import { GenerateKeyPairResult } from 'jose';
import { promises as fs } from 'fs';

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

export async function generateDpop(
    method: string,
    url: string,
    uuid: string,
    key?: { privateKey: any; publicKey: any }
): Promise<string> {
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

export type HeadersWithDpop = {
    DPOP: string;
    'X-Platform': string;
    Accept: string;
    'Accept-Encoding': string;
    'Content-Type': string;
    'User-Agent': string;
};

export async function getHeadersWithDpop(
    httpMethod: string,
    httpUrl: string,
    uuid?: string,
    key?: GenerateKeyPairResult
): Promise<HeadersWithDpop> {
    uuid = (uuid ?? crypto.randomUUID()) as `${string}-${string}-${string}-${string}-${string}`;
    const dpopToken = await generateDpop(
        httpMethod,
        httpUrl,
        uuid,
        key
    );
    return {
        DPOP: dpopToken,
        'X-Platform': 'web',
        Accept: '*/*',
        'Accept-Encoding': 'deflate, gzip',
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    };
}
export async function fetchMercari(
    httpMethod: string,
    httpUrl: string,
    headers: Record<string, string>,
    requestData: any
): Promise<any> {
    let response: Response | null = null;
    if (httpMethod === 'POST')
        response = await fetch(httpUrl, {
            method: httpMethod,
            headers: headers,
            body: JSON.stringify(requestData),
        });
    else if (httpMethod === 'GET') {
        const httpUrlWithParams = `${httpUrl}?${new URLSearchParams(
            requestData
        ).toString()}`;
        response = await fetch(httpUrlWithParams, {
            method: httpMethod,
            headers: headers,
        });
    }
    if (!response) throw new Error('No response received from fetchMercari');

    const data = await response.json();
    if (!response.ok) {
        throw new Error(
            `Error while fetching: ${response.status} ${response.statusText
            } ${JSON.stringify(data)}`,
            {}
        );
    }

    await fs.writeFile(
        'logs/fetch_mercari.json',
        JSON.stringify(data, null, 2),
        'utf-8'
    );

    return data;
}
