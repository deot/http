/* eslint-disable lines-between-class-members */

export interface HttpResponseOptions {
	body?: BodyInit | null;
	// From ResponseInit
	headers?: HeadersInit;
	status?: number;
	statusText?: string;
	// From Response
	url?: string;
	redirected?: boolean;
	type?: ResponseType;
	ok?: boolean;
	// Custom
	extra?: Record<string, any>;
}

export const ERROR_CODE = {
	HTTP_CODE_ILLEGAL: () => HttpResponse.error('HTTP_CODE_ILLEGAL'),
	HTTP_URL_EMPTY: () => HttpResponse.error('HTTP_URL_EMPTY'),
	HTTP_SEND_FAILED: () => HttpResponse.error('HTTP_SEND_FAILED'),
	HTTP_TOKEN_EXPIRE: () => HttpResponse.error('HTTP_TOKEN_EXPIRE'),
	HTTP_FORCE_DESTROY: () => HttpResponse.error('HTTP_FORCE_DESTROY'),
	HTTP_RESPONSE_PARSING_FAILED: () => HttpResponse.error('HTTP_RESPONSE_PARSING_FAILED'),
	HTTP_RESPONSE_REBUILD_FAILED: () => HttpResponse.error('HTTP_RESPONSE_REBUILD_FAILED'),
	HTTP_OPTIONS_BUILD_FAILED: () => HttpResponse.error('HTTP_OPTIONS_BUILD_FAILED'),
	HTTP_STATUS_ERROR: () => HttpResponse.error('HTTP_STATUS_ERROR'),
	HTTP_CANCEL: () => HttpResponse.error('HTTP_CANCEL'),
	HTTP_REQUEST_TIMEOUT: () => HttpResponse.error('HTTP_REQUEST_TIMEOUT'),
	HTTP_CONTENT_EXCEEDED: () => HttpResponse.error('HTTP_CONTENT_EXCEEDED')
};

export class HttpResponse {

	// From Response
	url!: string;
	body!: BodyInit | null;
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
		body: BodyInit | null | HttpResponse | HttpResponseOptions, 
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

		Object.keys(defaults).forEach((key) => {
			this[key] = typeof body?.[key] !== 'undefined' 
				? body?.[key] 
				: typeof options?.[key] !== 'undefined' 
					? options?.[key]
					: defaults[key];
		});
	}

	// From Response
	static error(statusText?: string) {
		return new HttpResponse(null, {
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