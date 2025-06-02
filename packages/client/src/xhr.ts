import type { HTTPProvider } from '@deot/http-core';
import { HTTPHeaders, HTTPResponse, ERROR_CODE } from '@deot/http-core';

const ignoreDuplicateOf = {
	'age': !0,
	'authorization': !0,
	'content-length': !0,
	'content-type': !0,
	'etag': !0,
	'expires': !0,
	'from': !0,
	'host': !0,
	'if-modified-since': !0,
	'if-unmodified-since': !0,
	'last-modified': !0,
	'location': !0,
	'max-forwards': !0,
	'proxy-authorization': !0,
	'referer': !0,
	'retry-after': !0,
	'user-agent': !0
};
// 可以考虑移入到HTTPHeaders内置作为string时的解析
const parseHeaders = (rawHeaders: string) => {
	const parsed = {};
	let key: string;
	let val: string;
	let i: number;

	rawHeaders && rawHeaders.split('\n').forEach((line) => {
		i = line.indexOf(':');
		key = line.substring(0, i).trim().toLowerCase();
		val = line.substring(i + 1).trim();

		/* istanbul ignore next -- @preserve */
		if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
			return;
		}

		/* istanbul ignore next -- @preserve */
		if (key === 'set-cookie') {
			if (parsed[key]) {
				parsed[key].push(val);
			} else {
				parsed[key] = [val];
			}
		} else {
			parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
		}
	});

	return parsed;
};

export const provider: HTTPProvider = (request, leaf) => {
	return new Promise((resolve, reject) => {
		const { onDownloadProgress, onUploadProgress, responseType, timeout, credentials, body, headers, method, url, async = true } = request;

		const xhr = new XMLHttpRequest();

		const getExtra = () => {
			return {
				status: xhr.status,
				headers: new HTTPHeaders(parseHeaders(xhr.getAllResponseHeaders()))
			};
		};

		const onError = (statusText: string, body$?: any) => {
			reject(HTTPResponse.error(statusText, {
				...getExtra(),
				body: body$
			}));
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({
				...getExtra(),
				body: body$
			}));
		};

		// 可以不用显式的使用removeEventListener, 经测试可以被垃圾回收
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
					? onError(ERROR_CODE.HTTP_RESPONSE_PARSING_FAILED)
					: onSuccess(response);
			} else {
				onError(ERROR_CODE.HTTP_STATUS_ERROR);
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

		for (const h in headers.toJSON()) {
			xhr.setRequestHeader(h, headers[h]);
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
