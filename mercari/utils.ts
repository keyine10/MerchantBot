import { GenerateKeyPairResult } from 'jose';
import { promises as fs } from 'fs';
import {
  MercariURLs,
  MercariSearchStatus,
  MercariSearchSort,
  MercariSearchOrder,
  MercariItemStatus,
  MercariItemConditionId,
  MercariSearchCategoryID,
} from './types';

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
    return data;
}
