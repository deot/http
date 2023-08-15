import type { HTTPProvider } from "@deot/http-core";
import { HTTPResponse, ERROR_CODE } from "@deot/http-core";

export const provider: HTTPProvider = (request, leaf) => {
	return new Promise((resolve, reject) => {
		const { onDownloadProgress, onUploadProgress, responseType, timeout, credentials, body, headers, method, url, async = true } = request;

		let xhr = new XMLHttpRequest();

		const onError = (statusText: string, body$?: any) => {
			reject(HTTPResponse.error(statusText, body$));
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({ body: body$ }));
		};

		const on = (event: string, handler: any, target?: any) => {
			target = target || xhr;
			handler && target.addEventListener(event, handler);
		};

		on('readystatechange', () => {
			if (
				xhr.readyState !== 4
				|| (xhr.status === 0)
			) return;

			if (xhr.status >= 200 && xhr.status < 300) {
				const response = !xhr.responseType 
					? xhr.responseText 
					: xhr.response;

				xhr.responseType && response === null 
					? onError(ERROR_CODE.HTTP_RESPONSE_PARSING_FAILED, xhr) 
					: onSuccess(response);
			} else {
				onError(ERROR_CODE.HTTP_STATUS_ERROR, xhr);
			}
		});

		on('abort', (e: any) => onError(ERROR_CODE.HTTP_CANCEL, e));
		on('error', /* istanbul ignore next */ (e: any) => onError(ERROR_CODE.HTTP_STATUS_ERROR, e)); // 当请求了不存在地址
		on('timeout', (e: any) => onError(ERROR_CODE.HTTP_REQUEST_TIMEOUT, e));
		on('progress', onDownloadProgress);
		on('progress', onUploadProgress, xhr.upload);

		xhr.open(method, url, async);
		/* istanbul ignore next -- @preserve */
		xhr.withCredentials = credentials === 'omit' ? false : !!credentials;
		timeout && (xhr.timeout = timeout);
		responseType && (xhr.responseType = responseType); 

		for (const h in headers) {
			if (Object.hasOwnProperty.call(headers, h)) {
				xhr.setRequestHeader(h, headers[h]);
			}
		}

		xhr.send(body as any);

		// rebuild cancel
		const originalCancel = leaf.cancel!;
		leaf.cancel = async () => {
			xhr.abort();
			await originalCancel();
		};

		leaf.server = xhr;
	});
};