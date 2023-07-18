import type { HttpProvider } from "./provider";
import type { HttpRequestOptions } from "./request";
import { HttpRequest } from "./request";

import { HttpShell } from "./shell";

type HttpControllerOptions = HttpRequest & {
	provider: HttpProvider;
	apis?: Record<string, string>;
}

export class HttpController {
	provider: HttpProvider;

	apis: Record<string, string>;

	request: HttpRequest;

	constructor(options: HttpControllerOptions) {
		if (!options?.provider) {
			throw new Error('TODO');
		}

		const { provider, apis = {}, ...globalOptions } = options || {};
		
		this.provider = provider;
		this.apis = apis;
		this.request = new HttpRequest(globalOptions);
	}

	http(
		url: string | HttpRequest | HttpRequestOptions, 
		requestOptions?: HttpRequestOptions
	) {
		const shell = new HttpShell(url, requestOptions, this);

		return shell.send();
	}
}