/* eslint-disable lines-between-class-members */
import { HTTPHeaders } from './headers';

export interface HTTPResponseOptions {
	// Allow Extra KeyValue
	[key: string]: any;

	body?: {} | BodyInit | null;
	// From ResponseInit
	headers?: HeadersInit | HTTPHeaders;
	status?: number;
	statusText?: string;
	// From Response
	url?: string;
	redirected?: boolean;
	type?: ResponseType;
	ok?: boolean;
}

export class HTTPResponse<T = {} | BodyInit | null> {
	// Allow Extra KeyValue
	[key: string]: any;

	// From Response
	url!: string;
	body!: T; // ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string
	headers!: HTTPHeaders;
	status!: number;
	statusText!: string;
	redirected!: boolean;
	type!: ResponseType;
	ok!: boolean;
	// TODO
	bodyUsed!: boolean;
	// Custom

	constructor(
		body?: BodyInit | null | HTTPResponse<T> | HTTPResponseOptions, 
		options?: HTTPResponseOptions
	) {
		const defaults = {
			// From Response
			body: null,
			headers: {},
			ok: true,
			redirected: false,
			status: 200,
			statusText: '',
			type: 'default',
			url: ''
		};

		const isBodyAsOptions = body && (body.constructor === Object || body instanceof HTTPResponse);
		const kv = isBodyAsOptions 
			? { ...defaults, ...(body as (HTTPResponse<T> | HTTPResponseOptions)), ...options } 
			: { ...defaults, body, ...options };

		Object.keys(kv).forEach((key) => {
			let v = typeof kv[key] !== 'undefined' 
				? kv[key] 
				: defaults[key];
			this[key] = key === 'headers' ? new HTTPHeaders(v) : v;
		});
	}

	// From Response
	static error(statusText?: string, options?: HTTPResponseOptions) {
		return new HTTPResponse(null, {
			...options,
			status: options?.status || 0,
			type: 'error',
			ok: false,
			statusText
		});
	}
	// static json() {}
	// static redirected() {}
	// arrayBuffer() {}
	// blob() {}
	// clone() {}
	// formData() {}
	// json() {}
	// text() {}
}