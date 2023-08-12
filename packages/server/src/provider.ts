import http from 'node:http';
import https from 'node:https';
import url from 'node:url';
import zlib from 'node:zlib';
import { http as httpFollow, https as httpsFollow } from 'follow-redirects';

import type { HTTPProvider } from "@deot/http-core";
import { HTTPResponse, ERROR_CODE } from "@deot/http-core";

export const provider: HTTPProvider = (request, leaf) => {
	return new Promise((resolve, reject) => {
		const onError = (statusText: string, body$?: any) => {
			reject(HTTPResponse.error(statusText, body$));
		};

		const onSuccess = (body$: any) => {
			resolve(new HTTPResponse({ body: body$ }));
		};

		const { maxRedirects, url: url$, responseType, maxContentLength, body } = request;
		const { protocol = 'http:' } = url.parse(url$);

		let transport: any;

		const isHttps = protocol === 'https:';
		// 是否重定向
		if (maxRedirects === 0) {
			transport = isHttps ? https : http;
		} else {
			transport = isHttps ? httpsFollow : httpFollow;
		}
		
		let ctx = transport.request(request, (res) => {
			if (ctx.aborted) return;
			if (res.statusCode >= 200 && res.statusCode < 300) {
				let stream = res;

				switch (res.headers['content-encoding']) {
					case 'gzip':
					case 'compress':
					case 'deflate':
						stream = stream.pipe(zlib.createUnzip());
						delete res.headers['content-encoding'];
						break;
					default:
						break;
				}

				if (responseType === 'stream') {
					onSuccess(stream);
				} else {
					let responseBuffer: any[] = [];
					stream.on('data', (chunk) => {
						responseBuffer.push(chunk);

						// 如果指定，请确保内容长度不超过maxContentLength
						if (
							maxContentLength > -1 
							&& Buffer.concat(responseBuffer).length > maxContentLength
						) {
							onError('HTTP_CONTENT_EXCEEDED', res);
						}
					});

					stream.on('error', (error) => {
						if (res.aborted) return;
						onError(ERROR_CODE.HTTP_STATUS_ERROR, error);
					});

					stream.on('end', () => {
						let responseData = Buffer.concat(responseBuffer);
						let result: Buffer | string = responseData;
						if (responseType !== 'arraybuffer') {
							result = responseData.toString('utf8');
						}
						onSuccess(result);
					});
				}
			} else {
				onError(res, ERROR_CODE.HTTP_STATUS_ERROR);
			}

			// rebuild cancel
			const originalCancel = leaf.cancel!;
			leaf.cancel = async () => {
				ctx.abort();
				await originalCancel();
			};

			leaf.server = ctx;

			body && typeof (body as any).pipe === 'function'
				? (body as any).pipe(ctx)
				: ctx.end(body);
		});
	});
};
