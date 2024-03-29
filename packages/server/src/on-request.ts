import { Readable } from 'node:stream';
import type { HTTPHook } from '@deot/http-core';
import * as Is from '@deot/helper-is';
import { formDataToStream, readBlob } from './helper';

// 针对服务端要额外做处理
export const onRequest: HTTPHook = (leaf) => {
	const { body: originalBody, headers } = leaf.request;

	let body = originalBody;
	if (!(Is.buffer(body) || Is.stream(body) || Is.string(body) || !body)) {
		if (Is.arrayBuffer(body)) {
			body = Buffer.from(new Uint8Array(body as ArrayBuffer));
		} else if (Is.formData(body)) {
			body = formDataToStream(
				body as FormData,
				(formHeaders: any) => {
					headers.set(formHeaders, true);
				}
			);
		} else if (Is.blob(body) || Is.file(body)) {
			const original = body as Blob;
			if (original.size) {
				headers.set('Content-Type', original.type || 'application/octet-stream', true);
			}

			headers.set('Content-Length', `${original.size || 0}`, true);
			body = Readable.from(readBlob(original));
		} else {
			throw new Error('Body after transformation must be a string, an ArrayBuffer, a Buffer, a Blob, or a Stream');
		}
	}

	leaf.request.body = body;
	leaf.request.headers = headers;

	return leaf;
};
