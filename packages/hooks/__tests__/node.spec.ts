import { HTTPController } from '@deot/http-core';
import { onRequest, onResponse } from '@deot/http-hooks';
import * as Server from '../../client/__tests__/fixtures/server';
import { provider } from '../../server/src/provider';
import { onRequest as onRequestServer } from '../../server/src/on-request';
import * as Data from './fixtures/data';

const JContentType = 'application/json'; // ['json']
const XContentType = 'application/x-www-form-urlencoded'; // ['urlencoded', 'form', 'form-data']
const MContentType = `multipart/form-data`;

// @vitest-environment node
describe('node.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = new HTTPController({
		provider,
		onRequest: [onRequest, onRequestServer],
		onResponse
	});

	it('Post, FormData', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.formData,
			onResponse(leaf) {
				expect(leaf.request.headers['Content-Type'].includes('multipart/form-data')).toBe(true);
			}
		});

		expect(response.body).toEqual(Data.response);
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

	it('Post, file', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.file,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(`application/json`);
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
				expect(leaf.request.headers['Content-Type']).toBe(`application/json`);
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
			body: Data.arrayBufferView
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, ArrayBuffer', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.arrayBuffer
		});

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

	it('Post, Buffer', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.buffer
		});

		expect(response.status).toBe(200);
	});

	it('Post, Array', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: [1, 2],
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(JContentType);
			}
		});

		expect(response.status).toBe(200);
	});

	it('Post, Array/XContentType', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: [1, 2],
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(XContentType);
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
				expect(leaf.request.body).toBe('0=1&1=2');
			}
		});

		expect(response.status).toBe(200);
	});

	it('Post, Number', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: 1,
			onResponse(leaf) {
				expect(leaf.request.body).toBe('1');
				expect(leaf.request.headers['Content-Type']).toBe(XContentType);
			}
		});

		expect(response.status).toBe(200);
	});

	it('Post, Number/JContentType', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: 1,
			headers: {
				'Content-Type': 'application/json'
			},
			onResponse(leaf) {
				expect(leaf.request.headers['Content-Type']).toBe(JContentType);
				expect(leaf.request.body).toBe('1');
			}
		});

		expect(response.status).toBe(200);
	});
});
