/* eslint-disable lines-between-class-members */
import type { HttpController } from "./controller";

import { HttpRequest } from "./request";
import { HttpResponse, ERROR_CODE } from "./response";
import type { HttpRequestOptions, HttpHook } from "./request";

export class HttpShell {
	parent: HttpController;

	originalRequest: HttpRequest;
	request!: HttpRequest;

	originalResponse!: HttpResponse;
	response!: HttpResponse;

	cancel: ((e: any) => void) | null = null;
	timeout: any = null;

	constructor(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions: HttpRequestOptions | undefined,
		parent: HttpController
	) {
		this.originalRequest = new HttpRequest(url, requestOptions, parent.request);
		this.parent = parent;
	}

	async task(fns: HttpHook[]) {
		return fns.reduceRight((pre, fn) => {
			pre = pre.then(() => fn(this));
			return pre;
		}, Promise.resolve(this));
	}

	async send() {
		await this.loading();
		await this.before();

		const ajax = this.after();
		const cancel = new Promise((_, reject) => {
			this.cancel = () => {
				this.cancel = null;
				this.timeout && clearTimeout(this.timeout);
				reject(ERROR_CODE.HTTP_CANCEL());
			};
		});
		const timeout = new Promise((_, reject) => {
			this.timeout = setTimeout(() => {
				this.timeout = null;
				this.loaded();
				reject(ERROR_CODE.HTTP_REQUEST_TIMEOUT());
			}, this.request.timeout);
		});

		await Promise.race([ajax, cancel].concat(this.request.timeout ? [timeout] : []));
		this.timeout && clearTimeout(this.timeout);

		await this.loaded();

		return this.response;
	}

	async loading() {
		const { localData, onLoading } = this.originalRequest;

		if (!localData) {
			await this.task(onLoading);
		}
	}

	async loaded() {
		const { localData, onLoaded } = this.originalRequest;

		if (!localData) {
			await this.task(onLoaded);
		}
	}

	async before() {
		const { apis } = this.parent;
		const { onBefore } = this.originalRequest;

		let beforeResult: any;
		try {
			beforeResult = (await this.task(onBefore));
		} catch (e) {
			throw ERROR_CODE.HTTP_OPTIONS_BUILD_FAILED();
		}

		let request: HttpRequest;
		if (beforeResult instanceof HttpRequest) {
			request = new HttpRequest(beforeResult);
		} else {
			request = new HttpRequest(this.originalRequest);
		}

		if (!/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
			let combo = request.url.split('?'); // 避免before带上?token=*之类
			request.url = `${apis[combo[0]] || ''}${combo[1] ? `?${combo[1]}` : ''}`;
		}

		if (!request.url && !request.localData) {
			throw ERROR_CODE.HTTP_URL_EMPTY();
		}

		this.request = request;
	}

	async after() {
		const { localData, onAfter } = this.request;
		let target = localData 
			? Promise.resolve(new HttpResponse(localData)) 
			: this.parent.provider(this.request);
		
		let response: HttpResponse = await target;
		this.originalResponse = response;

		let afterResult: any;
		try {
			afterResult = (await this.task(onAfter));
		} catch (e) {
			throw ERROR_CODE.HTTP_OPTIONS_BUILD_FAILED();
		}

		if (afterResult instanceof HttpResponse) {
			response = new HttpResponse(afterResult);
		} else {
			response = new HttpResponse(this.originalResponse);
		}
		
		this.response = response;
	}
}