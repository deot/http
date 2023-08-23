/* eslint-disable no-dupe-class-members */
/* eslint-disable lines-between-class-members */
type Headers = HTTPHeaders | Record<string, any> | HeadersInit;

export class HTTPHeaders {
	[key: string]: any;

	constructor(headers?: Headers) {
		headers && this.set(headers, true);
	}

	set(headers: Headers, rewrite?: boolean): HTTPHeaders;
	set(key: string, value: any, rewrite?: boolean): HTTPHeaders;
	set(keyOrHeaders: string | Headers, valueOrRewrite: any, rewrite?: boolean) {
		if (typeof keyOrHeaders === 'string') {
			let key = keyOrHeaders;
			let value = valueOrRewrite;
			this[key] = rewrite ? value : (this[key] || value);
		} else {
			let headers = keyOrHeaders;
			rewrite = valueOrRewrite;

			if (headers instanceof HTTPHeaders) {
				headers = headers.toJSON();
			} else {
				headers = { ...headers };
			}

			Object.keys(headers).forEach(k => {
				this.set(k, headers[k], rewrite);
			});
		}

		return this;
	}

	has(key: string) {
		return !!this[key];
	}

	get(key: string) {
		return this[key];
	}

	toJSON() {
		const target = Object.create(null);

		for (const h in this) {
			if (Object.hasOwnProperty.call(this, h) && this[h]) {
				target[h] = this[h];
			}
		}

		return target;
	}

	get [Symbol.toStringTag]() {
		return 'HTTPHeaders';
	}
}