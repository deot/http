/* eslint-disable no-dupe-class-members */
/* eslint-disable lines-between-class-members */
import type { HttpController } from "./controller";

import { HttpRequest } from "./request";
import { HttpResponse } from "./response";
import { ERROR_CODE } from './error';
import { getUid } from './utils';
import type { HttpRequestOptions, HttpHook } from "./request";

interface HttpShellLeaf {
	id: string;
	cancel?: () => void; 
	timeout?: any;
	request?: HttpRequest;
	originalRequest?: HttpRequest;
	response?: HttpResponse;
	originalResponse?: HttpResponse;
	target?: Promise<HttpResponse>;
}
export class HttpShell {
	parent: HttpController;

	request: HttpRequest;

	leafs: Record<string, HttpShellLeaf> = {};

	constructor(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions: HttpRequestOptions | undefined,
		parent: HttpController
	) {
		this.request = new HttpRequest(url, requestOptions, parent.request);
		this.parent = parent;
	}

	async task(fns: HttpHook[]) {
		return fns.reduceRight((pre, fn) => {
			pre = pre.then(() => fn(this));
			return pre;
		}, Promise.resolve(this));
	}

	send(returnLeaf: true): HttpShellLeaf;
	send(getLeaf?: (leaf: HttpShellLeaf) => void): Promise<HttpResponse>;
	send(value?: ((leaf: HttpShellLeaf) => void)| boolean) {
		this.parent._add(this);

		const id = getUid(`shell.leaf`);
		const leaf: HttpShellLeaf = { id, originalRequest: this.request };
		this.leafs[id] = leaf;

		const cancel = new Promise((_, reject) => {
			leaf.cancel = () => reject(this.error(id, ERROR_CODE.HTTP_CANCEL));
		});

		let error: HttpResponse;
		let response: HttpResponse;
		const target = Promise.resolve()
			.then(() => this.loading())
			.then(() => this.before(id))
			.then(() => {
				const ajax = this.after(id);
				
				const timeout = new Promise((_, reject) => {
					leaf.timeout = setTimeout(() => reject(this.error(id, ERROR_CODE.HTTP_REQUEST_TIMEOUT)), this.request.timeout);
				});

				return Promise.race([ajax, cancel].concat(this.request.timeout ? [timeout] : []));
			})
			.then(() => (response = (leaf.response as HttpResponse)))
			.catch(e => (error = e))
			.then(() => this.clear(id))
			.then(() => {
				return error 
					? Promise.reject(error) 
					: response;
			});

		leaf.target = target;

		typeof value === 'function' 
			&& value(leaf);

		return typeof value !== 'function' && value
			? leaf 
			: target;
	}

	async cancel(id?: string) {
		if (id) {
			const leaf = this.leafs[id];
			if (leaf?.cancel && leaf?.target) {
				leaf.cancel();
				await new Promise<void>(resolve => { 
					leaf.target!.catch(() => {}).finally(resolve);
				});
			}
		} else {
			await Object.keys(this.leafs).reduce((pre, id$) => {
				pre = pre.then(() => this.cancel(id$));
				return pre;
			}, Promise.resolve());
		}
	}

	async clear(id: string) {
		const { timeout } = this.leafs[id];
		timeout && clearTimeout(timeout);

		delete this.leafs[id];
		await this.loaded();

		// 当都已经完成时，通知父层移除以减少
		if (!Object.keys(this.leafs).length) {
			this.parent._remove(this);
		}
	}

	async loading() {
		const { localData, onLoading } = this.request;

		if (!localData) {
			await this.task(onLoading);
		}
	}

	async loaded() {
		const { localData, onLoaded } = this.request;

		if (!localData) {
			await this.task(onLoaded);
		}
	}

	async before(id: string) {
		const { apis } = this.parent;
		const { onBefore } = this.request;

		let result: any;
		try {			
			result = (await this.task(onBefore));
		} catch (e) {
			throw this.error(id, ERROR_CODE.HTTP_OPTIONS_BUILD_FAILED);
		}

		let request: HttpRequest;
		if (result instanceof HttpRequest) {
			request = new HttpRequest(result);
		} else {
			request = new HttpRequest(this.request);
		}

		if (!/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
			let combo = request.url.split('?'); // 避免before带上?token=*之类
			request.url = `${apis[combo[0]] || ''}${combo[1] ? `?${combo[1]}` : ''}`;
		}

		this.leafs[id].request = request;

		if (!request.url && !request.localData) {
			throw this.error(id, ERROR_CODE.HTTP_URL_EMPTY);
		}
	}

	async after(id: string) {
		const request = this.leafs[id].request as HttpRequest;
		const { localData, onAfter } = request;
		let target = localData 
			? Promise.resolve(new HttpResponse({ body: localData })) 
			: this.parent.provider(request);
		
		let response: HttpResponse = await target;

		this.leafs[id].originalResponse = response;

		let result: any;
		try {
			result = (await this.task(onAfter));
		} catch (e) {
			throw this.error(id, ERROR_CODE.HTTP_OPTIONS_BUILD_FAILED);
		}

		if (result instanceof HttpResponse) {
			response = new HttpResponse(result);
		} else {
			response = new HttpResponse(this.leafs[id].originalResponse);
		}

		this.leafs[id].response = response;
	}

	error(id: string, statusText?: string) {
		return HttpResponse.error(statusText, {
			[`@@internal`]: {
				request: {
					input: this.request,
					used: this.leafs[id]?.request
				},

				response: {
					input: this.leafs[id]?.originalResponse,
					used: this.leafs[id]?.response
				}
			}
		});
	}
}