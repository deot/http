/* eslint-disable lines-between-class-members */
import type { HTTPShellLeaf } from './shell';

export interface HTTPRequestOptions {
	// Allow Extra KeyValue
	[key: string]: any;

	url?: string;

	// From Request, removed(signal)
	method?: string;
	headers?: HeadersInit;
	body?: Record<string, any> | BodyInit | null;
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
	onLoading?: HTTPHook | HTTPHook[];
	onLoaded?: HTTPHook | HTTPHook[];
	onBefore?: HTTPHook | HTTPHook[];
	onAfter?: HTTPHook | HTTPHook[];
	timeout?: number;
	maxTries?: number;
	// 仅当maxTries > 1 是有效, 可配合做轮询请求
	interval?: number;
}

export type HTTPHook<T = any> = (leaf: HTTPShellLeaf) => T;
export class HTTPRequest {
	// Allow Extra KeyValue
	[key: string]: any;

	// From Request, removed(signal)
	url!: string;
	method!: string;
	headers!: HeadersInit;
	body!: Record<string, any> | BodyInit | null;
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
	onLoading!: HTTPHook[];
	onLoaded!: HTTPHook[];
	onBefore!: HTTPHook[];
	onAfter!: HTTPHook[];
	timeout!: number;
	maxTries!: number;
	interval!: number;

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
			interval: 0
		};
		const isUrlAsOptions = url && (url.constructor === Object || url instanceof HTTPRequest);
		const kv = isUrlAsOptions 
			? { ...defaults, ...parent, ...(url as (HTTPRequest | HTTPRequestOptions)), ...options } 
			: { ...defaults, ...parent, url, ...options };

		Object.keys(kv).forEach((key) => {
			this[key] = typeof kv[key] !== 'undefined' 
				? kv[key]
				: defaults[key];
		});

		// Merge Hooks & Filter Same
		const it = (url && typeof url === 'object' ? url : options) || {};
		const hooks = ['onLoading', 'onLoaded', 'onBefore', 'onAfter'] as const;
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