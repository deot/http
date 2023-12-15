import { getUid } from './utils';
import { HTTPRequest } from './request';
import type { HTTPResponse } from './response';

type PromiseHook<T> = (response: HTTPResponse<T>) => any;
export class HTTPShellLeaf<T = any> {
	id = getUid(`shell.leaf`);

	cancel!: () => Promise<void>;

	timeout?: ReturnType<typeof global.setTimeout>;

	/**
	 * 当前请求的Promise
	 */
	target!: Promise<HTTPResponse<T>>;

	/**
	 * 未onRequest的值
	 */
	originalRequest!: HTTPRequest;

	/**
	 * 未onResponse的值，默认: undefined
	 */
	originalResponse?: HTTPResponse<T>;

	/**
	 * onRequest后的值, 默认: originalRequest
	 */
	request!: HTTPRequest;

	/**
	 * onResponse后的值，默认: undefined
	 */
	response?: HTTPResponse<T>;

	// 让provider可以设值
	[key: string]: any;

	constructor(request: HTTPRequest) {
		this.originalRequest = request;
		this.request = new HTTPRequest(request);
	}

	then(resolve: PromiseHook<T>, reject: PromiseHook<T>) {
		return this.target.then(resolve, reject);
	}

	catch(callback?: PromiseHook<T>) {
		return this.target.catch(callback);
	}

	finally(callback?: () => void) {
		return this.target.finally(callback);
	}
}
