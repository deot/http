import type { HTTPRequestOptions } from './request';
import { HTTPRequest } from './request';

import { HTTPShell } from './shell';
import type { HTTPShellLeaf } from './shell-leaf';

export class HTTPController {
	request: HTTPRequest;

	shells: HTTPShell[];

	constructor(options?: HTTPRequestOptions) {
		this.request = new HTTPRequest(options || {});

		this.shells = [];
	}

	/**
	 * 主动发起一个请求，返回HTTPShellLeaf<T>(符合Promise A+, 且支持取消操作)
	 * 其中T为响应的结果
	 * @param url ~
	 * @param requestOptions ~
	 * @returns ~
	 */
	http<T = any>(
		url: string | HTTPRequest | HTTPRequestOptions,
		requestOptions?: HTTPRequestOptions,
	): HTTPShellLeaf<T> {
		const shell = this._getShell<T>(url, requestOptions);

		return shell.send();
	}

	/**
	 * 封装一个请求，返回HttpShell, 支持单个重复发送，取消操作
	 * @param url ~
	 * @param requestOptions ~
	 * @returns ~
	 */
	custom<T = any>(
		url: string | HTTPRequest | HTTPRequestOptions,
		requestOptions?: HTTPRequestOptions,
	): HTTPShell<T> {
		const shell = this._getShell<T>(url, requestOptions);

		return shell;
	}

	/**
	 * 取消所有请求或取消指定请求
	 * @param id ~
	 */
	async cancel(id?: string | HTTPShellLeaf) {
		await this.shells.reduce((pre, shell) => {
			pre = pre.then(() => shell.cancel(id));
			return pre;
		}, Promise.resolve());

		if (!id) {
			this.shells = this.shells.filter(i => !!i.request.shared);
		}
	}

	/**
	 * 清理shared
	 * @param shared ~
	 */
	async removeShared(shared?: any) {
		await this.shells.reduce((pre, shell) => {
			pre = pre.then(() => shell.removeIfShared(shared));
			return pre;
		}, Promise.resolve());
	}

	async clear() {
		await this.cancel();
		await this.removeShared();
	}

	// `@internal`
	_getShell<T>(
		url: string | HTTPRequest | HTTPRequestOptions,
		requestOptions?: HTTPRequestOptions,
	): HTTPShell<T> {
		let shell = new HTTPShell<T>(url, requestOptions, this);
		if (shell.request.shared) {
			shell = this.shells.find((shell$) => {
				if (shell$.request.shared !== shell.request.shared) return false;
				try {
					return JSON.stringify(shell$.request) === JSON.stringify(shell.request);
				} catch (_) { /* empty */ }
			}) || shell;
		}

		return shell;
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
