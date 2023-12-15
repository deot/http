import type { HTTPProvider } from '@deot/http-core';
import { provider as XHRProvider } from './xhr';
import { provider as FetchProvider } from './fetch';
import { provider as JSONProvider } from './jsonp';

export const provider: HTTPProvider = (request, leaf) => {
	if (request.jsonp) {
		return JSONProvider(request, leaf);
	}
	return request.useXHR || !(window?.fetch)
		? XHRProvider(request, leaf)
		: FetchProvider(request, leaf);
};
