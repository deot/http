import { Readable } from 'node:stream';
import type { HTTPHook } from '@deot/http-core';
import * as Is from '@deot/helper-is';
import { formDataToStream, readBlob } from './helper';

// 针对服务端要额外做处理
export const onRequest: HTTPHook = (leaf) => {
	let { body, headers } = leaf.request;
	
	if (!(Is.buffer(body) || Is.stream(body) || Is.string(body) || !body)) {
		if (Is.arrayBuffer(body)) {
			body = Buffer.from(new Uint8Array(body as ArrayBuffer));
		} else if (Is.formData(body)) {
			body = formDataToStream(
				body as FormData,
				(formHeaders: any) => {
					headers = {
						...headers,
						...formHeaders
					};
				}
			);
		} else if (Is.blob(body) || Is.file(body)) {
			let original = body as Blob;
			if (original.size) {
				headers = {
					...headers,
					'Content-Type': original.type || 'application/octet-stream'
				};
			}

			headers = {
				...headers,
				'Content-Length': `${original.size || 0}`
			};

			body = Readable.from(readBlob(original));
		} else {
			throw new Error('Body after transformation must be a string, an ArrayBuffer, a Buffer, a Blob, or a Stream');
		}
	}

	leaf.request.body = body;
	leaf.request.headers = headers;

	return leaf;
};