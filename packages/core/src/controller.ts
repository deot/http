import type { HttpProvider } from "./provider";
import type { HttpRequestOptions } from "./request";
import type { HttpResponse } from "./response";
import { HttpRequest } from "./request";

import { HttpShell } from "./shell";
import type { HttpShellLeaf } from "./shell";

export type HttpControllerOptions = HttpRequestOptions & {
	provider: HttpProvider;
	apis?: Record<string, string>;
}

export class HttpController {
	provider: HttpProvider;

	apis: Record<string, string>;

	request: HttpRequest;

	shells: HttpShell[];

	constructor(options: HttpControllerOptions) {
		if (!options?.provider) {
			throw new Error('[@deot/http-core]: provider is required.');
		}

		const { provider, apis = {}, ...globalOptions } = options;
		
		this.provider = provider;
		this.apis = apis;
		this.request = new HttpRequest(globalOptions);

		this.shells = [];
	}

	/**
	 * 发起一个请求，返回Promise<HttpResponse>
	 * @param {string|HttpRequest|HttpRequestOptions} url ~
	 * @param {HttpRequestOptions} requestOptions ~
	 * @returns {Promise<HttpResponse>} ~
	 */
	http(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions?: HttpRequestOptions,
	): Promise<HttpResponse> {
		const shell = new HttpShell(url, requestOptions, this);

		return shell.send();
	}

	/**
	 * 发起一个请求，返回HttpShell, 支持单个重复发送，取消操作
	 * @param {string|HttpRequest|HttpRequestOptions} url ~
	 * @param {HttpRequestOptions} requestOptions ~
	 * @returns {HttpShell} ~
	 */
	custom(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions?: HttpRequestOptions,
	): HttpShell {
		const shell = new HttpShell(url, requestOptions, this);

		return shell;
	}

	/**
	 * 取消所有请求或取消指定请求
	 * @param {string|HttpShellLeaf} id ~
	 */
	async cancel(id?: string | HttpShellLeaf) {
		await this.shells.reduce((pre, shell) => {
			pre = pre.then(() => shell.cancel(id));
			return pre;
		}, Promise.resolve());

		if (!id) {
			this.shells = [];
		}
	}

	// `@internal`
	_add(shell: HttpShell) {
		if (!this.shells.includes(shell)) {
			this.shells.push(shell);
		}
	}

	// `@internal`
	_remove(shell: HttpShell) {
		this.shells = this.shells.filter(i => i !== shell);
	}
}