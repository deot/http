/* eslint-disable lines-between-class-members */
import type { HttpShell } from './shell';

export interface HttpRequestOptions {
	[key: string]: any;

	url?: string;

	// From RequestInit
	method?: string;
	headers?: HeadersInit;
	body?: BodyInit | null;
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
	extra?: Record<string, any>;
}

export type HttpHook<T = any> = (shell: HttpShell) => T;
export class HttpRequest {

	// From Request
	url: string;
	method!: string;
	headers!: HeadersInit;
	body!: BodyInit | null;
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
	extra: Record<string, any> = {};

	constructor(
		url: string | HttpRequest | HttpRequestOptions, 
		options?: HttpRequestOptions,
		parent?: HttpRequest
	) {
		const it = (url && typeof url === 'object' ? url : options) || {};

		this.url = it.url || (typeof url === 'string' ? url : '');

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
			timeout: 60000
		};

		Object.keys(defaults).forEach((key) => {
			this[key] = typeof it[key] !== 'undefined' 
				? it[key] 
				: typeof parent?.[key] !== 'undefined' 
					? parent?.[key]
					: defaults[key];
		});

		this.extra = {
			...parent?.extra,
			...it?.extra
		};

		const hooks = ['onLoading', 'onLoading', 'onBefore', 'onAfter'] as const;

		hooks.forEach((key) => {
			const fn = it[key];
			const current = Array.isArray(fn) ? fn : fn ? [fn] : [];
			this[key] = parent ? parent[key].concat(current) : current;
		});
	}

	// TODO: Request
	arrayBuffer() {}
	blob() {}
	clone() {}
	formData() {}
	json() {}
	text() {}
}