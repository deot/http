/* eslint-disable lines-between-class-members */
import type { HTTPShellLeaf } from './shell-leaf';
import type { HTTPProvider } from './provider';
import { HTTPHeaders } from './headers';
import { HTTPResponse } from './response';

export interface HTTPRequestOptions {
	// Allow Extra KeyValue
	[key: string]: any;

	url?: string;

	// From Request, removed(signal)
	method?: string;
	headers?: HeadersInit | HTTPHeaders;
	body?: {} | BodyInit | null;
	mode?: RequestMode;
	credentials?: RequestCredentials;
	cache?: RequestCache;
	redirect?: RequestRedirect;
	referrer?: string;
	integrity?: string;
	keepalive?: boolean;
	referrerPolicy?: ReferrerPolicy;

	// Custom
	localData?: any;
	onStart?: HTTPHook | HTTPHook[];
	onFinish?: HTTPHook | HTTPHook[];
	onRequest?: HTTPHook | HTTPHook[];
	onResponse?: HTTPHook | HTTPHook[];
	timeout?: number;
	maxTries?: number;
	// 仅当maxTries > 1 是有效, 可配合做轮询请求
	interval?: number;

	// 提供者/适配器
	provider?: HTTPProvider;
}

const defaultProvider = (request: HTTPRequest) => new HTTPResponse({ body: request.body }); // TODO: 也可以考虑抛出错误
export type HTTPHook<T = any> = (leaf: HTTPShellLeaf) => T;
export class HTTPRequest {
	// Allow Extra KeyValue
	[key: string]: any;

	// From Request, removed(signal)
	url!: string;
	method!: string;
	headers!: HTTPHeaders;
	body!: {} | BodyInit | null;
	mode!: RequestMode;
	credentials!: RequestCredentials;
	cache!: RequestCache;
	redirect!: RequestRedirect;
	referrer!: string;
	integrity!: string;
	keepalive!: boolean;
	referrerPolicy!: ReferrerPolicy;
	// TODO: ~
	bodyUsed!: boolean;

	// Custom
	localData = null;
	onStart!: HTTPHook[];
	onFinish!: HTTPHook[];
	onRequest!: HTTPHook[];
	onResponse!: HTTPHook[];
	timeout!: number;
	maxTries!: number;
	interval!: number;
	provider!: HTTPProvider;

	constructor(
		url: string | HTTPRequest | HTTPRequestOptions, 
		options?: HTTPRequestOptions,
		parent?: HTTPRequest
	) {
		const defaults = {
			// From Request, removed(signal)
			method: 'GET',
			headers: {},
			body: null,
			mode: 'cors',
			credentials: 'same-origin',
			cache: 'default',
			redirect: 'follow',
			integrity: '',
			keepalive: false,
			referrer: 'about:client',
			referrerPolicy: '',
			// Custom
			localData: null,
			timeout: 60000,
			maxTries: 1,
			interval: 0,
			provider: defaultProvider
		};
		const isUrlAsOptions = url && (url.constructor === Object || url instanceof HTTPRequest);
		const kv = isUrlAsOptions 
			? { ...defaults, ...parent, ...(url as (HTTPRequest | HTTPRequestOptions)), ...options } 
			: { ...defaults, ...parent, url, ...options };

		Object.keys(kv).forEach((key) => {
			const v = typeof kv[key] !== 'undefined' 
				? kv[key]
				: defaults[key];
			this[key] = key === 'headers' ? new HTTPHeaders(v) : v;
		});

		// Merge Hooks & Filter Same
		const it = (url && typeof url === 'object' ? url : options) || {};
		const hooks = ['onStart', 'onFinish', 'onRequest', 'onResponse'] as const;
		hooks.forEach((key) => {
			const fn = it[key];
			const current = Array.isArray(fn) ? fn : fn ? [fn] : [];
			this[key] = (parent ? current.concat(parent[key]) : current).filter((v, i, source) => {
				return source.indexOf(v) === i;
			});
		});
	}

	// TODO: Request
	// arrayBuffer() {}
	// blob() {}
	// clone() {}
	// formData() {}
	// json() {}
	// text() {}
}