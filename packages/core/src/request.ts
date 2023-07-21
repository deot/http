/* eslint-disable lines-between-class-members */
import type { HttpShellLeaf } from './shell';

export interface HttpRequestOptions {
	// Allow Extra KeyValue
	[key: string]: any;

	url?: string;

	// From RequestInit
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
	signal?: AbortSignal | null;

	// Custom
	localData?: any;
	onLoading?: HttpHook | HttpHook[];
	onLoaded?: HttpHook | HttpHook[];
	onBefore?: HttpHook | HttpHook[];
	onAfter?: HttpHook | HttpHook[];
	timeout?: number;
	maxTries?: number;
	// 仅当maxTries > 1 是有效, 可配合做轮询请求
	interval?: number;
}

export type HttpHook<T = any> = (leaf: HttpShellLeaf) => T;
export class HttpRequest {
	// Allow Extra KeyValue
	[key: string]: any;

	// From Request
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
	signal!: AbortSignal;
	// TODO: ~
	bodyUsed!: boolean;

	// Custom
	localData = null;
	onLoading!: HttpHook[];
	onLoaded!: HttpHook[];
	onBefore!: HttpHook[];
	onAfter!: HttpHook[];
	timeout!: number;
	maxTries!: number;
	interval!: number;

	constructor(
		url: string | HttpRequest | HttpRequestOptions, 
		options?: HttpRequestOptions,
		parent?: HttpRequest
	) {
		const defaults = {
			// From Request
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
			signal: new AbortController().signal,
			// Custom
			localData: null,
			timeout: 60000,
			maxTries: 1,
			interval: 0
		};
		const isUrlAsOptions = url && (url.constructor === Object || url instanceof HttpRequest);
		const kv = isUrlAsOptions 
			? { ...defaults, ...parent, ...(url as (HttpRequest | HttpRequestOptions)), ...options } 
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
			this[key] = (parent ? parent[key].concat(current) : current).filter((v, i, source) => {
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