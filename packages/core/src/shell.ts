/* eslint-disable no-promise-executor-return */
/* eslint-disable no-dupe-class-members */
/* eslint-disable lines-between-class-members */
import type { HTTPController } from "./controller";

import { HTTPRequest } from "./request";
import { HTTPResponse } from "./response";
import { HTTPShellLeaf } from "./shell-leaf";
import { ERROR_CODE } from './error';
import type { HTTPRequestOptions, HTTPHook } from "./request";

export class HTTPShell {
	parent: HTTPController;

	request: HTTPRequest;

	leafs: Record<string, HTTPShellLeaf> = {};

	isPending = false; // 用于控制多个send时，只执行一次onStart/onFinish

	constructor(
		url: string | HTTPRequest | HTTPRequestOptions, 
		requestOptions: HTTPRequestOptions | undefined,
		parent: HTTPController
	) {
		this.request = new HTTPRequest(url, requestOptions, parent.request);
		this.parent = parent;
	}

	// 发起请求
	send(): HTTPShellLeaf {
		this.parent._add(this);

		const leaf = new HTTPShellLeaf(this.request);
		this.leafs[leaf.id] = leaf;

		const cancel = new Promise((_, reject) => {
			leaf.cancel = async () => {
				reject(this.error(leaf, ERROR_CODE.HTTP_CANCEL));
				await new Promise<void>(resolve => { 
					leaf.target.catch(() => {}).finally(resolve);
				});
			};
		});

		let error: HTTPResponse;
		let response: HTTPResponse;
		const target = new Promise<HTTPResponse>((resolve, reject) => {
			Promise.resolve()
				.then(() => this.loading(leaf))
				.then(() => this.before(leaf))
				.then(() => {
					const ajax = this.after(leaf);
					const { timeout } = leaf.originalRequest;
					const races = [ajax, cancel];
					timeout && races.push(
						new Promise((_, reject$$) => {
							leaf.timeout = setTimeout(
								() => reject$$(this.error(leaf, ERROR_CODE.HTTP_REQUEST_TIMEOUT)),
								timeout
							);
						})
					);
					return Promise.race(races);
				})
				.then(() => (response = (leaf.response as HTTPResponse)))
				.catch(e => (error = e))
				.then(() => {
					const onSuccess = (e: HTTPResponse) => {
						this.clear(leaf).then(() => resolve(e));
					};

					const onError = async (e: HTTPResponse) => {
						this.clear(leaf).then(() => reject(e));
					};

					const isError = error || response.type === 'error';
					// maxTries
					const request = new HTTPRequest(this.request);
					request.maxTries -= 1;
					if (isError && request.maxTries >= 1) {
						// 重试的过程中，强制清理，onStart，onFinish，确保它只执行一次
						request.onStart = [];
						request.onFinish = [];
						return Promise.resolve()
							.then(() => request.interval && new Promise(_ => setTimeout(_, request.interval)))
							.then(() => this.parent.http(request))
							.then(onSuccess)
							.catch(onError);
					}
					
					return isError ? onError(error || response) : onSuccess(response);
				});
		});

		leaf.target = target;
		return leaf;
	}

	// `@internal`
	async task(leaf: HTTPShellLeaf, fns: HTTPHook[], done?: (e?: any) => void) {
		if (!fns.length) return;

		let needBreak = false;
		return fns.reduce((pre, fn) => {
			pre = pre
				.then(() => {
					if (!needBreak) {
						let result = fn(leaf);
						// leaf含then方法是基于leaf.target 所以不能直接返回leaf
						return result === leaf || result;
					}
					return false;
				}).then((e) => {
					!needBreak && done && done(e);
					if (e === false) {
						needBreak = true;
					}
				});
			return pre;
		}, Promise.resolve());
	}

	// `@internal`
	async clear(leaf: HTTPShellLeaf): Promise<void> {
		const { timeout, id } = leaf;
		timeout && clearTimeout(timeout);

		await this.loaded(leaf);

		// clear keyValue
		Object.keys(leaf).forEach(key => delete leaf[key]);
		delete this.leafs[id];

		// 当都已经完成时，通知父层移除以减少占用
		if (!Object.keys(this.leafs).length) {
			this.parent._remove(this);
		}
	}

	/**
	 * 请求完成后清理，避免内存泄漏
	 * @param {string|HTTPShellLeaf} id 当前请求或当前请求id
	 * @returns {Promise<void>} ~
	 */
	async cancel(id?: string | HTTPShellLeaf): Promise<void> {
		if (id) {
			const leaf = typeof id === 'string' ? this.leafs[id] : id;
			if (leaf?.cancel) {
				await leaf.cancel();
			}
		} else {
			await Object.keys(this.leafs).reduce((pre, id$) => {
				pre = pre.then(() => this.cancel(id$));
				return pre;
			}, Promise.resolve());
		}
	}

	/**
	 * 请求前完成触发，在onRequest之前
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async loading(leaf: HTTPShellLeaf): Promise<void> {
		const { localData, onStart } = leaf.originalRequest;

		if (!localData && !this.isPending) {
			this.isPending = true;
			await this.task(leaf, onStart);
		}
	}

	/**
	 * 请求完成触发, 在onResponse之后
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async loaded(leaf: HTTPShellLeaf): Promise<void> {
		const { localData, onFinish } = leaf.originalRequest;
		const isOnly = Object.keys(this.leafs).length === 1;

		if (!localData && isOnly && this.isPending) {
			this.isPending = false;
			await this.task(leaf, onFinish);
		}
	}

	/**
	 * 请求前处理，可修改请求信息，或根据结果全局事务
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async before(leaf: HTTPShellLeaf): Promise<void> {
		const { onRequest } = leaf.originalRequest;

		try {			
			await this.task(leaf, onRequest, (result: any) => {
				let request: HTTPRequest;
				if (result instanceof HTTPRequest) {
					request = new HTTPRequest(result);
				} else if (result === true) {
					request = leaf.request!;
				} else {
					request = new HTTPRequest(leaf.originalRequest!, result);
				}
				leaf.request = request;
			});
		} catch (e) {
			throw this.error(leaf, ERROR_CODE.HTTP_OPTIONS_REBUILD_FAILED, e);
		}

		if (!leaf.request!.url && !leaf.request!.localData) {
			throw this.error(leaf, ERROR_CODE.HTTP_URL_EMPTY);
		}
	}

	/**
	 * 请求后处理，可修改返回信息，或根据结果全局事务
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async after(leaf: HTTPShellLeaf): Promise<void> {
		const { localData, onResponse, provider } = leaf.request!;
		
		let target = localData 
			? Promise.resolve(new HTTPResponse({ body: localData })) 
			: provider(leaf.request!, leaf);
		
		let originalResponse: HTTPResponse;

		try {
			originalResponse = await target;
		} catch (e) {
			originalResponse = e as HTTPResponse;
		}

		leaf.originalResponse = originalResponse;
		leaf.response = new HTTPResponse(originalResponse);

		try {
			await this.task(leaf, onResponse, (result: any) => {
				let response: HTTPResponse;
				if (result instanceof HTTPResponse) {
					response = new HTTPResponse(result);
				} else if (result === true) {
					response = leaf.response!;
				} else {
					response = new HTTPResponse(leaf.originalResponse, result);
				}

				leaf.response = response;
			});
		} catch (e) {
			throw this.error(leaf, ERROR_CODE.HTTP_RESPONSE_REBUILD_FAILED, e);
		}
	}

	/**
	 * 错误处理
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @param {string} statusText Error Code
	 * @param {any} body exception
	 * @returns {HTTPResponse} ~
	 */
	error(leaf: HTTPShellLeaf, statusText: string, body?: any): HTTPResponse {
		return HTTPResponse.error(statusText, {
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