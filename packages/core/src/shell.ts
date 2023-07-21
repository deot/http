/* eslint-disable no-promise-executor-return */
/* eslint-disable no-dupe-class-members */
/* eslint-disable lines-between-class-members */
import type { HttpController } from "./controller";

import { HttpRequest } from "./request";
import { HttpResponse } from "./response";
import { ERROR_CODE } from './error';
import { getUid } from './utils';
import type { HttpRequestOptions, HttpHook } from "./request";

export interface HttpShellLeaf {
	id: string;
	cancel?: () => void; 
	timeout?: any;
	request?: HttpRequest;
	originalRequest: HttpRequest;
	response?: HttpResponse;
	originalResponse?: HttpResponse;
	target: Promise<HttpResponse>;
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

	async task(leaf: HttpShellLeaf, fns: HttpHook[]) {
		return fns.reduceRight((pre, fn) => {
			pre = pre.then(() => fn(leaf));
			return pre;
		}, Promise.resolve(leaf));
	}

	send(returnLeaf: true): HttpShellLeaf;
	send(getLeaf?: (leaf: HttpShellLeaf) => void): Promise<HttpResponse>;
	send(value?: ((leaf: HttpShellLeaf) => void)| boolean) {
		this.parent._add(this);

		const id = getUid(`shell.leaf`);
		const leaf = { id, originalRequest: this.request } as HttpShellLeaf;
		this.leafs[id] = leaf;

		const cancel = new Promise((_, reject) => {
			leaf.cancel = () => reject(this.error(leaf, ERROR_CODE.HTTP_CANCEL));
		});

		let error: HttpResponse;
		let response: HttpResponse;
		const target = new Promise<HttpResponse>((resolve, reject) => {
			Promise.resolve()
				.then(() => this.loading(leaf))
				.then(() => this.before(leaf))
				.then(() => {
					const ajax = this.after(leaf);
					const { timeout } = leaf.originalRequest;
					const races = [ajax, cancel];
					if (timeout) {
						races.push(
							new Promise((_, reject$) => {
								leaf.timeout = setTimeout(() => reject$(this.error(leaf, ERROR_CODE.HTTP_REQUEST_TIMEOUT)), timeout);
							})
						);
					}
					return Promise.race(races);
				})
				.then(() => (response = (leaf.response as HttpResponse)))
				.catch(e => (error = e))
				.then(() => this.clear(leaf))
				.then(() => {
					const isError = error || response.type === 'error';
					// maxTries
					const request = new HttpRequest(this.request);
					request.maxTries -= 1;
					if (isError && request.maxTries >= 1) {
						return Promise.resolve()
							.then(() => request.interval && new Promise(_ => setTimeout(_, request.interval)))
							.then(() => this.parent.http(request))
							.then(resolve)
							.catch(reject);
					}
					
					return isError ? reject(error || response) : resolve(response);
				});
		});

		leaf.target = target;

		typeof value === 'function' && value(leaf);
		return typeof value !== 'function' && value
			? leaf 
			: target;
	}

	async cancel(id?: string | HttpShellLeaf) {
		if (id) {
			const leaf = typeof id === 'string' ? this.leafs[id] : id;
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

	async clear(leaf: HttpShellLeaf) {
		const { timeout, id } = leaf;
		timeout && clearTimeout(timeout);

		await this.loaded(leaf);

		// clear keyValue
		Object.keys(leaf).forEach(key => delete leaf[key]);
		delete this.leafs[id];

		// 当都已经完成时，通知父层移除以减少
		if (!Object.keys(this.leafs).length) {
			this.parent._remove(this);
		}
	}

	async loading(leaf: HttpShellLeaf) {
		const { localData, onLoading } = leaf.originalRequest;

		if (!localData) {
			await this.task(leaf, onLoading);
		}
	}

	async loaded(leaf: HttpShellLeaf) {
		const { localData, onLoaded } = leaf.originalRequest;

		if (!localData) {
			await this.task(leaf, onLoaded);
		}
	}

	async before(leaf: HttpShellLeaf) {
		const { apis } = this.parent;
		const { onBefore } = leaf.originalRequest;

		let result: any;
		try {			
			result = (await this.task(leaf, onBefore));
		} catch (e) {
			throw this.error(leaf, ERROR_CODE.HTTP_OPTIONS_REBUILD_FAILED, e);
		}

		let request: HttpRequest;
		if (result instanceof HttpRequest) {
			request = new HttpRequest(result);
		} else if (result === leaf) {
			request = leaf.request || new HttpRequest(leaf.originalRequest);
		} else {
			request = new HttpRequest(leaf.originalRequest!, result);
		}

		if (request.url && !/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
			let combo = request.url.split('?'); // 避免before带上?token=*之类
			request.url = `${apis[combo[0]] || ''}${combo[1] ? `?${combo[1]}` : ''}`;
		}
		leaf.request = request;

		if (!request.url && !request.localData) {
			throw this.error(leaf, ERROR_CODE.HTTP_URL_EMPTY);
		}
	}

	async after(leaf: HttpShellLeaf) {
		const { localData, onAfter } = leaf.request as HttpRequest;
		
		let target = localData 
			? Promise.resolve(new HttpResponse({ body: localData })) 
			: this.parent.provider(leaf.request!);
		
		let response: HttpResponse = await target;

		leaf.originalResponse = response;

		let result: any;
		try {
			result = (await this.task(leaf, onAfter));
		} catch (e) {
			throw this.error(leaf, ERROR_CODE.HTTP_RESPONSE_REBUILD_FAILED, e);
		}

		if (result instanceof HttpResponse) {
			response = new HttpResponse(result);
		} else if (result === leaf) {
			response = leaf.response || new HttpResponse(leaf.originalResponse);
		} else {
			response = new HttpResponse(leaf.originalResponse, result);
		}

		leaf.response = response;
	}

	error(leaf: HttpShellLeaf, statusText: string, body?: any) {
		return HttpResponse.error(statusText, {
			body,
			[`@@internal`]: {
				request: {
					input: this.request,
					used: leaf?.request
				},

				response: {
					input: leaf?.originalResponse,
					used: leaf?.response
				}
			}
		});
	}
}