import { Readable } from 'node:stream';
import { createInstance } from '@deot/http-server';
import * as Server from '../../client/__tests__/fixtures/server';
import * as Data from '../../hooks/__tests__/fixtures/data';
import { onRequest } from '../src/on-request';
import { formDataToStream } from '../src/helper';

// @vitest-environment node
describe('hooks.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createInstance({
		credentials: 'omit'
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

	it('Post, ArrayBufferView', async () => {
		const response = await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: Data.arrayBufferView
		});

		expect(response.body).toEqual(Data.response);
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
				onRequest: [onRequest]
			});
		} catch (e: any) {
			expect(e.body.message).toMatch('Body after t');
		}
	});
});
