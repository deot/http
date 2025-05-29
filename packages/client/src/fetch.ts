import type { HTTPProvider } from '@deot/http-core';
import { HTTPRequest, HTTPResponse, HTTPHeaders, HTTPShellLeaf, ERROR_CODE } from '@deot/http-core';

export const provider: HTTPProvider = (request: HTTPRequest, leaf: HTTPShellLeaf) => {
	return new Promise((resolve, reject) => {
		const { url, headers, body, credentials, method, timeout, responseType, ...fetchOptions } = request;

		const controller = new AbortController();

		let timer = timeout
			? setTimeout(() => {
					controller.abort(ERROR_CODE.HTTP_REQUEST_TIMEOUT);
					onError(ERROR_CODE.HTTP_REQUEST_TIMEOUT);
				}, timeout)
			: null;
		let response: Response;

		const getExtra = () => {
			const headers$ = new HTTPHeaders();
			if (response) {
				response.headers.forEach((v, k) => headers$.set(k, v, true));
			}
			return {
				status: response?.status,
				headers: headers$
			};
		};

		const onError = (statusText: string, body$?: any) => {
			reject(HTTPResponse.error(statusText, {
				...getExtra(),
				body: body$
			}));
			timer && clearTimeout(timer);
			timer = null;
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({
				...getExtra(),
				body: body$
			}));
			timer && clearTimeout(timer);
			timer = null;
		};

		/**
		 * bug fix, 看实际情况早处理
		 * iOS 10 fetch() 没有finally方法
		 * 使用@babel/polyfill修复Promise，无法修复fetch，可见fetch内部实现了一套Promise
		 */
		const fetch$ = fetch(url, {
			headers: headers.toJSON(),
			body: body as any,
			credentials,
			method,
			signal: controller.signal,
			...fetchOptions
		}).then((res) => {
			response = res;
			if (res.status >= 200 && res.status < 300) {
				const fn = res[responseType || 'text'];
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
			/* istanbul ignore next -- @preserve */
			if (e === ERROR_CODE.HTTP_CANCEL || e === ERROR_CODE.HTTP_REQUEST_TIMEOUT) {
				onError(e);
			} else {
				onError(ERROR_CODE.HTTP_STATUS_ERROR, e);
			}
			// no throw again, avoid unhandled error
		});

		// rebuild cancel
		const originalCancel = leaf.cancel!;
		leaf.cancel = async () => {
			controller.abort(ERROR_CODE.HTTP_CANCEL);
			await originalCancel();
		};

		leaf.server = fetch$;
	});
};
