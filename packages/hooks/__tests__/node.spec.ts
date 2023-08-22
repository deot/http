import { Readable } from 'node:stream';
import { HTTPController } from '@deot/http-core';
import { onTransformRequest, onTransformResponse, onTransformRequestServer } from '@deot/http-hooks';
import * as Server from '../../client/__tests__/fixtures/server';
import { provider } from '../../server/src/provider';
import * as Data from './fixtures/data';
import { formDataToStream } from '../src/helper/form-data-to-stream';

const JContentType = 'application/json'; // ['json']
const XContentType = 'application/x-www-form-urlencoded'; // ['urlencoded', 'form', 'form-data']
const MContentType = `multipart/form-data`;

// @vitest-environment node
describe('node.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = new HTTPController({
		provider,
		onRequest: [onTransformRequest, onTransformRequestServer],
		onResponse: onTransformResponse
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

	it('Post, FormData, no type', async () => {
		const formData = new FormData();
		formData.append('response', Data.responseString);
		// escapeName
		formData.append('blob"', Data.blobWithoutType);
		
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: formData,
			onResponse(leaf) {
				expect(leaf.request.headers['Content-Type'].includes('multipart/form-data')).toBe(true);
			}
		});

		expect(response.body).toEqual(Data.response);
	});

	it('Post, Native FormData', async () => {
		const http = await import('node:http');
		const url = await import('node:url');
		const { port, hostname } = url.parse(serverUrl);
		let headers: any;
		const body = formDataToStream(Data.formData, (headers$: any) => {
			headers = headers$;
		});

		await new Promise((resolve, reject) => {
			const req = http.request({
				port,
				hostname,
				method: 'POST',
				headers
			}, (res: any) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					res.on('data', () => {});
					res.on('end', resolve);
				} else {
					reject();
				}
			});

			body.pipe(req);
		});
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

	it('Post, blob, no type', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.blobWithoutType,
			onResponse(leaf) {
				expect(leaf.originalRequest.headers['Content-Type']).toBe(undefined);
				expect(leaf.request.headers['Content-Type']).toBe(`application/octet-stream`);
			}
		});

		expect(response.body).toEqual(Data.response);
		expect(response.status).toBe(200);
	});

	it('Post, blob, no content', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.blobWithoutContent
		});

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

	it('Post, Stream', async () => {
		const stream = new Readable();
		stream.push(Data.string);
		stream.push(null); // no more data

		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: stream
		});

		expect(response.status).toBe(200);
	});

	it('Post, Date/coverage', async () => {
		try {
			await Network.http(`${serverUrl}`, {
				method: 'POST',
				body: new Date(),
				onRequest: [onTransformRequestServer]
			});
		} catch (e: any) {
			expect(e.body.message).toMatch('Body after t');
		}
	});
});