import type { HTTPRequestOptions } from "./request";
import { HTTPRequest } from "./request";

import { HTTPShell } from "./shell";
import type { HTTPShellLeaf } from "./shell-leaf";

export class HTTPController {
	request: HTTPRequest;

	shells: HTTPShell[];

	constructor(options?: HTTPRequestOptions) {
		this.request = new HTTPRequest(options || {});

		this.shells = [];
	}

	/**
	 * 发起一个请求，返回Promise<HttpResponse>
	 * @param {string|HTTPRequest|HTTPRequestOptions} url ~
	 * @param {HTTPRequestOptions} requestOptions ~
	 * @returns {HTTPShellLeaf} ~
	 */
	http(
		url: string | HTTPRequest | HTTPRequestOptions, 
		requestOptions?: HTTPRequestOptions,
	): HTTPShellLeaf {
		const shell = new HTTPShell(url, requestOptions, this);

		return shell.send();
	}

	/**
	 * 发起一个请求，返回HttpShell, 支持单个重复发送，取消操作
	 * @param {string|HTTPRequest|HTTPRequestOptions} url ~
	 * @param {HTTPRequestOptions} requestOptions ~
	 * @returns {HTTPShell} ~
	 */
	custom(
		url: string | HTTPRequest | HTTPRequestOptions, 
		requestOptions?: HTTPRequestOptions,
	): HTTPShell {
		const shell = new HTTPShell(url, requestOptions, this);

		return shell;
	}

	/**
	 * 取消所有请求或取消指定请求
	 * @param {string|HTTPShellLeaf} id ~
	 */
	async cancel(id?: string | HTTPShellLeaf) {
		await this.shells.reduce((pre, shell) => {
			pre = pre.then(() => shell.cancel(id));
			return pre;
		}, Promise.resolve());

		if (!id) {
			this.shells = [];
		}
	}

	// `@internal`
	_add(shell: HTTPShell) {
		if (!this.shells.includes(shell)) {
			this.shells.push(shell);
		}
	}

	// `@internal`
	_remove(shell: HTTPShell) {
		this.shells = this.shells.filter(i => i !== shell);
	}
}