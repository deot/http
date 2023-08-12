import { getUid } from './utils';
import { HTTPRequest } from "./request";
import type { HTTPResponse } from "./response";

type PromiseHook = (response: HTTPResponse) => any;
export class HTTPShellLeaf {
	id = getUid(`shell.leaf`);

	cancel!: () => Promise<void>;
 
	timeout?: ReturnType<typeof global.setTimeout>;

	/**
	 * 当前请求的Promise
	 */
	target!: Promise<HTTPResponse>;

	/**
	 * 未onRequest的值
	 */
	originalRequest!: HTTPRequest;

	/**
	 * 未onResponse的值，默认: undefined
	 */
	originalResponse?: HTTPResponse;

	/**
	 * onRequest后的值, 默认: originalRequest
	 */
	request!: HTTPRequest;

	/**
	 * onResponse后的值，默认: undefined
	 */
	response?: HTTPResponse;

	// 让provider可以设值
	[key: string]: any;

	constructor(request: HTTPRequest) {
		this.originalRequest = request;
		this.request = new HTTPRequest(request);
	}

	then(resolve: PromiseHook, reject: PromiseHook) {
		return this.target.then(resolve, reject);
	}

	catch(callback?: PromiseHook) {
		return this.target.catch(callback);
	}

	finally(callback?: () => void) {
		return this.target.finally(callback);
	}
}