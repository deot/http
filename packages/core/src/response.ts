/* eslint-disable lines-between-class-members */

export interface HTTPResponseOptions {
	// Allow Extra KeyValue
	[key: string]: any;

	body?: Record<string, any> | BodyInit | null;
	// From ResponseInit
	headers?: HeadersInit;
	status?: number;
	statusText?: string;
	// From Response
	url?: string;
	redirected?: boolean;
	type?: ResponseType;
	ok?: boolean;
}

export class HTTPResponse {
	// Allow Extra KeyValue
	[key: string]: any;

	// From Response
	url!: string;
	body!: Record<string, any> | BodyInit | null; // ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string
	headers!: HeadersInit;
	status!: number;
	statusText!: string;
	redirected!: boolean;
	type!: ResponseType;
	ok!: boolean;
	// TODO
	bodyUsed!: boolean;
	// Custom

	constructor(
		body?: BodyInit | null | HTTPResponse | HTTPResponseOptions, 
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
			? { ...defaults, ...(body as (HTTPResponse | HTTPResponseOptions)), ...options } 
			: { ...defaults, body, ...options };

		Object.keys(kv).forEach((key) => {
			this[key] = typeof kv[key] !== 'undefined' 
				? kv[key] 
				: defaults[key];
		});
	}

	// From Response
	static error(statusText?: string, options?: HTTPResponseOptions) {
		return new HTTPResponse(null, {
			...options,
			type: 'error',
			status: 0,
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