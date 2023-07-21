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

	http(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions?: HttpRequestOptions,
	): Promise<HttpResponse> {
		const shell = new HttpShell(url, requestOptions, this);

		return shell.send();
	}

	custom(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions?: HttpRequestOptions,
	): HttpShell {
		const shell = new HttpShell(url, requestOptions, this);

		return shell;
	}

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