import * as http from 'node:http';
import * as https from 'node:https';
import * as url from 'node:url';

import { http as httpFollow, https as httpsFollow } from 'follow-redirects';

import type { HTTPProvider } from "@deot/http-core";
import { HTTPResponse, ERROR_CODE } from "@deot/http-core";

export const provider: HTTPProvider = (request, leaf) => {
	return new Promise((resolve, reject) => {
		let timer: any;
		const onError = (statusText: string, body$?: any) => {
			if (body$) {
				body$.status = body$.statusCode;
			}
			reject(HTTPResponse.error(statusText, body$));
			timer && clearTimeout(timer);
			timer = null;
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({ body: body$ }));
			timer && clearTimeout(timer);
			timer = null;
		};

		const { 
			url: url$,
			maxRedirects, 
			responseType, 
			maxContentLength = Infinity, 
			body, 
			method, 
			headers,
			timeout,
			...requestOptions
		} = request;
		const { protocol, port, hostname } = url.parse(url$);

		let transport: typeof http | typeof https;

		const isHttps = protocol === 'https:';
		// 是否重定向
		if (maxRedirects === 0) {
			transport = isHttps ? https : http;
		} else {
			transport = isHttps ? httpsFollow : httpFollow;
		}

		let req = transport.request({
			method,
			hostname,
			port,
			path: url$.replace(/^\?/, ''),
			headers: headers.toJSON(),
			...requestOptions
		}, (res) => {
			if (!res.statusCode || req.destroyed) return;
			if (res.statusCode >= 200 && res.statusCode < 300) {
				// 可以通过onResponse对stream进行转换
				if (responseType === 'stream') {
					onSuccess(res);
					return;
				}
								
				let responseBuffer: any[] = [];
				res.on('data', (chunk) => {
					responseBuffer.push(chunk);

					// 如果指定，请确保内容长度不超过maxContentLength
					if (
						maxContentLength > -1 
						&& Buffer.concat(responseBuffer).length > maxContentLength
					) {
						onError('HTTP_CONTENT_EXCEEDED', res);
					}
				});

				res.on('error', /* istanbul ignore next */(error) => {
					if (req.destroyed) return;
					onError(ERROR_CODE.HTTP_STATUS_ERROR, error);
				});

				res.on('end', () => {
					let responseData = Buffer.concat(responseBuffer);
					let result: Buffer | string = responseData;
					if (responseType !== 'arraybuffer') {
						result = responseData.toString('utf8');
					}

					onSuccess(result);
				});
			} else {
				onError(ERROR_CODE.HTTP_STATUS_ERROR, res);
			}
		});

		// 不使用`req.setTimeout`, 存在延迟
		timeout && (timer = setTimeout(() => {
			req.destroy();
			onError(ERROR_CODE.HTTP_REQUEST_TIMEOUT);
		}, timeout));

		// rebuild cancel
		const originalCancel = leaf.cancel!;
		leaf.cancel = async () => {
			req.destroy();
			await originalCancel();
		};

		leaf.server = req;
		
		// body instanceof Readable
		if (body && typeof (body as any).pipe === 'function') {
			(body as any).pipe(req);
		} else {
			req.end(body);
		}
	});
};
