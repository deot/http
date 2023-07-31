/* eslint-disable no-promise-executor-return */
/* eslint-disable no-dupe-class-members */
/* eslint-disable lines-between-class-members */
import type { HTTPController } from "./controller";

import { HTTPRequest } from "./request";
import { HTTPResponse } from "./response";
import { ERROR_CODE } from './error';
import { getUid } from './utils';
import type { HTTPRequestOptions, HTTPHook } from "./request";

export interface HTTPShellLeaf {
	id: string;
	cancel: () => void; 
	timeout: any;
	target: Promise<HTTPResponse>;
	originalRequest: HTTPRequest;

	request?: HTTPRequest;
	response?: HTTPResponse;
	originalResponse?: HTTPResponse;

	// 让provider可以设值
	[key: string]: any;
}
export class HTTPShell {
	parent: HTTPController;

	request: HTTPRequest;

	leafs: Record<string, HTTPShellLeaf> = {};

	constructor(
		url: string | HTTPRequest | HTTPRequestOptions, 
		requestOptions: HTTPRequestOptions | undefined,
		parent: HTTPController
	) {
		this.request = new HTTPRequest(url, requestOptions, parent.request);
		this.parent = parent;
	}

	// 发起请求
	send(returnLeaf: true): HTTPShellLeaf;
	send(getLeaf?: (leaf: HTTPShellLeaf) => void): Promise<HTTPResponse>;
	send(value?: ((leaf: HTTPShellLeaf) => void)| boolean) {
		this.parent._add(this);

		const id = getUid(`shell.leaf`);
		const leaf = { id, originalRequest: this.request } as HTTPShellLeaf;
		this.leafs[id] = leaf;

		const cancel = new Promise((_, reject) => {
			leaf.cancel = () => reject(this.error(leaf, ERROR_CODE.HTTP_CANCEL));
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
						new Promise((_, reject$) => {
							leaf.timeout = setTimeout(
								() => reject$(this.error(leaf, ERROR_CODE.HTTP_REQUEST_TIMEOUT)),
								timeout
							);
						})
					);
					return Promise.race(races);
				})
				.then(() => (response = (leaf.response as HTTPResponse)))
				.catch(e => (error = e))
				.then(() => this.clear(leaf))
				.then(() => {
					const isError = error || response.type === 'error';
					// maxTries
					const request = new HTTPRequest(this.request);
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

	// `@internal`
	async task(leaf: HTTPShellLeaf, fns: HTTPHook[], done?: (e?: any) => void) {
		let needBreak = false;

		// 至少要执行一次
		if (!fns.length && done) return done();

		return fns.reduce((pre, fn) => {
			pre = pre
				.then(() => {
					if (!needBreak) {
						return fn(leaf);
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
			if (leaf?.cancel && leaf?.target) {
				leaf.cancel();
				await new Promise<void>(resolve => { 
					leaf.target.catch(() => {}).finally(resolve);
				});
			}
		} else {
			await Object.keys(this.leafs).reduce((pre, id$) => {
				pre = pre.then(() => this.cancel(id$));
				return pre;
			}, Promise.resolve());
		}
	}

	/**
	 * 请求前完成触发，在onBefore之前
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async loading(leaf: HTTPShellLeaf): Promise<void> {
		const { localData, onLoading } = leaf.originalRequest;

		if (!localData) {
			await this.task(leaf, onLoading);
		}
	}

	/**
	 * 请求完成触发, 在onAfter之后
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async loaded(leaf: HTTPShellLeaf): Promise<void> {
		const { localData, onLoaded } = leaf.originalRequest;

		if (!localData) {
			await this.task(leaf, onLoaded);
		}
	}

	/**
	 * 请求前处理，可修改请求信息，或根据结果全局事务
	 * @param {HTTPShellLeaf} leaf 当前请求
	 * @returns {Promise<void>} ~
	 */
	async before(leaf: HTTPShellLeaf): Promise<void> {
		const { onBefore } = leaf.originalRequest;

		try {			
			await this.task(leaf, onBefore, (result: any) => {
				let request: HTTPRequest;
				if (result instanceof HTTPRequest) {
					request = new HTTPRequest(result);
				} else if (result === leaf) {
					request = leaf.request || new HTTPRequest(leaf.originalRequest);
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
		const { localData, onAfter } = leaf.request as HTTPRequest;
		
		let target = localData 
			? Promise.resolve(new HTTPResponse({ body: localData })) 
			: this.parent.provider(leaf.request!, leaf);
		
		let originalResponse: HTTPResponse;

		try {
			originalResponse = await target;
		} catch (e) {
			originalResponse = e as HTTPResponse;
		}

		leaf.originalResponse = originalResponse;

		try {
			await this.task(leaf, onAfter, (result: any) => {
				let response: HTTPResponse;
				if (result instanceof HTTPResponse) {
					response = new HTTPResponse(result);
				} else if (result === leaf) {
					response = leaf.response || new HTTPResponse(leaf.originalResponse);
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