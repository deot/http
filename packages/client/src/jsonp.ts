import type { HTTPProvider } from "@deot/http-core";
import { HTTPRequest, HTTPResponse, ERROR_CODE } from "@deot/http-core";

export const provider: HTTPProvider = (request: HTTPRequest) => {
	return new Promise((resolve, reject) => {
		const { jsonp, url } = request;
		if (typeof jsonp !== 'string' || window[jsonp]) {
			reject(HTTPResponse.error(ERROR_CODE.HTTP_CODE_ILLEGAL));
		}

		Object.defineProperty(window, jsonp, {
			value: (body) => resolve(new HTTPResponse({ body }))
		});

		let script = document.createElement("script");
		let head = document.getElementsByTagName("head")[0];
		
		script.src = url;
		head.appendChild(script);
	});
};