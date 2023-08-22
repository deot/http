import { HTTPController } from '@deot/http-core';
import { onTransformRequest, onTransformResponse } from '@deot/http-hooks';
import * as Server from '../../client/__tests__/fixtures/server';
import { provider } from '../../client/src/fetch';
import * as Data from './fixtures/data';

const JContentType = 'application/json'; // ['json']
const XContentType = 'application/x-www-form-urlencoded'; // ['urlencoded', 'form', 'form-data']
const MContentType = `multipart/form-data`;

// @vitest-environment jsdom
describe('fetch.ts', async () => {
	const originalFetch = window.fetch;
	// 让测试环境和真实浏览器环境一致(xhr.spec.ts是一致的)
	window.fetch = (url: any, request: any) => {
		if (request.body instanceof Blob || request.body?.get?.('files[]')) {
			request.body = Data.string;
		}

		return originalFetch(url, request);
	};
	const serverUrl = await Server.impl();
	const Network = new HTTPController({
		provider,
		onRequest: onTransformRequest,
		onResponse: onTransformResponse
	});

	it('Post, HTMLFormElement', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.form,
			onResponse(leaf) {
				expect(leaf.request.headers['Content-Type']).toBe(undefined);
			}
		});
		expect(response.body).toEqual(Data.response);
	});

	it('Post, FormData', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.formData,
			onRequest(leaf) {
				// 测试环境不支持formData里含file, coverage
				(leaf.request.body as any).delete('file');
			},
			onResponse(leaf) {
				expect(leaf.request.headers['Content-Type']).toBe(undefined);
			}
		});
		expect(response.body).toEqual(Data.response);
	});

	it('Post, FormData, application/json', async () => {
		try {
			await Network.http(`${serverUrl}`, {
				method: 'POST',
				body: Data.form,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_OPTIONS_REBUILD_FAILED');
			expect(e.body.message).toMatch('need formDataToJSON');
		}
	});

	it('Post, json', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.json,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(JContentType);
			}
		});

		expect(response.body).toEqual(Data.response);
	});

	it('Post, json, application/x-www-form-urlencoded', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.json,
			headers: {
				'Content-Type': XContentType
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, json, multipart/form-data', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: {
				a: 0,
				b: '',
				c: undefined,
				d: null,
				f: false,
				...Data.json
			},
			headers: {
				'Content-Type': MContentType
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, blob', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.blob,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, file', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.file,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, string', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.string,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, URLSearchParams', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.params,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, ArrayBufferView', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.arrayBufferView,
			onResponse(leaf) {
				expect(leaf.request.body).toBe(Data.arrayBufferView.buffer);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, ArrayBuffer', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.arrayBuffer,
			onResponse(leaf) {
				expect(leaf.request.body).toBe(Data.arrayBufferView.buffer);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, FileList', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.files,
			onResponse(leaf) {
				expect(leaf.request.body instanceof FormData).toBe(true);
			}
		});

		// 实际的环境，这两个值是一致的
		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, Custom', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.custom,
			headers: {
				'Content-Type': JContentType
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, Date', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: new Date()
		});

		expect(response.status).toBe(200);
	});
});