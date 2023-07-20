/* eslint-disable lines-between-class-members */

export interface HttpResponseOptions {
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

export class HttpResponse {
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
		body?: BodyInit | null | HttpResponse | HttpResponseOptions, 
		options?: HttpResponseOptions
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

		const isBodyAsOptions = body && (body.constructor === Object || body instanceof HttpResponse);
		const kv = isBodyAsOptions 
			? { ...defaults, ...(body as (HttpResponse | HttpResponseOptions)), ...options } 
			: { ...defaults, body, ...options };

		Object.keys(kv).forEach((key) => {
			this[key] = typeof kv[key] !== 'undefined' 
				? kv[key] 
				: defaults[key];
		});
	}

	// From Response
	static error(statusText?: string, options?: HttpResponseOptions) {
		return new HttpResponse(null, {
			...options,
			type: 'error',
			status: 0,
			ok: false,
			statusText
		});
	}
	static json() {}
	static redirected() {}
	arrayBuffer() {}
	blob() {}
	clone() {}
	formData() {}
	json() {}
	text() {}
}