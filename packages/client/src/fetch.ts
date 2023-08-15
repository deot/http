import type { HTTPProvider } from "@deot/http-core";
import { HTTPRequest, HTTPResponse, HTTPShellLeaf, ERROR_CODE } from "@deot/http-core";

export const provider: HTTPProvider = (request: HTTPRequest, leaf: HTTPShellLeaf) => {
	return new Promise((resolve, reject) => {
		const { url, headers, body, credentials, method, timeout, responseType, ...fetchOptions } = request;

		const controller = new AbortController();

		let timer = timeout 
			? setTimeout(() => {
				controller.abort();
				onError(ERROR_CODE.HTTP_REQUEST_TIMEOUT);
			}, timeout)
			: null;

		const onError = (statusText: string, body$?: any) => {
			reject(HTTPResponse.error(statusText, body$));
			timer && clearTimeout(timer);
			timer = null;
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({ body: body$ }));
			timer && clearTimeout(timer);
			timer = null;
		};


		/**
		 * bug fix, 看实际情况早处理
		 * iOS 10 fetch() 没有finally方法
		 * 使用@babel/polyfill修复Promise，无法修复fetch，可见fetch内部实现了一套Promise
		 */
		const fetch$ = fetch(url, {
			headers,
			body: body as any,
			credentials,
			method,
			signal: controller.signal,
			...fetchOptions
		}).then((res) => {
			if (res.status >= 200 && res.status < 300) {
				let fn = res[responseType || 'text'];
				if (!fn) return onSuccess(res);
				fn.call(res)
					.then((data: any) => {
						onSuccess(data);
					})
					.catch((error: any) => {
						onError(ERROR_CODE.HTTP_RESPONSE_PARSING_FAILED, error);
					});
			} else {
				onError(ERROR_CODE.HTTP_STATUS_ERROR, res);
			}
			return res;
		}).catch((e) => {
			onError(ERROR_CODE.HTTP_STATUS_ERROR, e);
			// no throw again, avoid unhandled error 
		});

		// rebuild cancel
		const originalCancel = leaf.cancel!;
		leaf.cancel = async () => {
			controller.abort();
			await originalCancel();
		};

		leaf.server = fetch$;
	});
};