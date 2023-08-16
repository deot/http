import { Readable } from 'node:stream';
import { createInstance } from '@deot/http-server';
import * as Server from '../../client/__tests__/fixtures/server';

describe('server.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createInstance({
		credentials: 'omit'
	});

	it('Get', async () => {
		const response = await Network.http(serverUrl);
		expect(response.body.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('Post', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};
		const response = await Network.http(serverUrl, { 
			timeout: 0,
			method: 'POST',
			body
		});

		expect(response.body).toEqual(body.response);
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	/**
	 * https://stackoverflow.com/questions/69761580/keep-getting-a-delete-400-bad-request-with-my-rest-api
	 * 服务端发起的delete不允许带body，否则会报400
	 * 以这样的形式 /user/:id
	 */
	it('Delete', async () => {
		const response = await Network.http(serverUrl, { 
			method: 'DELETE'
		});

		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('Delete，Bad Request', async () => {
		try {
			await Network.http(serverUrl, { 
				method: 'DELETE',
				body: 'any'
			});

		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('Put', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};
		const response = await Network.http(serverUrl, { 
			method: 'PUT',
			body
		});

		expect(response.body).toEqual(body.response);
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('timeout', async () => {
		try {
			await Network.http(serverUrl, { timeout: 10 });
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_REQUEST_TIMEOUT');
		}
	});

	it('headers', async () => {
		let headers = {};
		// eslint-disable-next-line no-proto
		(headers as any).__proto__['Cookie'] = 'any';
		await Network.http(`${serverUrl}`, {
			headers
		});
	});

	it('headers, null', async () => {
		let headers = {};
		// eslint-disable-next-line no-proto
		(headers as any)['Cookie'] = null;
		await Network.http(`${serverUrl}`, {
			headers
		});
	});

	it('maxContentLength', async () => {
		try {
			await Network.http(`${serverUrl}`, {
				maxContentLength: 10
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_CONTENT_EXCEEDED');
		}
	});

	it('error', async () => {
		try {
			await Network.http(`dgszyjnxcaipwzy.jpg`);
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_STATUS_ERROR');
		}
	});

	it('cancel', async () => {
		try {
			const leaf = Network.http(serverUrl, { 
				method: 'PUT',
			});
			setTimeout(() => leaf.cancel());
			await leaf;
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_CANCEL');
		}
	});

	it('request, stream', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};
		const stream = new Readable();
		stream.push(JSON.stringify(body));
		stream.push(null); // no more data

		const response = await Network.http(serverUrl, { 
			method: 'POST',
			body: stream
		});

		expect(response.body).toEqual(body.response);
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('https', async () => {
		const response = await Network.http('https://qq.com');
		try {
			await Network.http('https://qq.com', { maxRedirects: 0 });
		} catch (e: any) {
			expect(e.status).toBe(302);
		}
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('maxRedirects', async () => {
		const response = await Network.http(serverUrl, { maxRedirects: 0 });

		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('responseType, arraybuffer', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};

		const response = await Network.http(serverUrl, { 
			method: 'POST',
			body,
			responseType: 'arraybuffer'
		});

		expect(response.body instanceof Buffer).toBe(true);
	});

	it('responseType, stream', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};

		const response = await Network.http(serverUrl, { 
			method: 'POST',
			body,
			responseType: 'stream'
		});

		const data = await new Promise((resolve) => {
			let responseBuffer: any[] = [];
			response.body.on('data', (chunk) => {
				responseBuffer.push(chunk);
			});

			response.body.on('end', () => {
				let responseData = Buffer.concat(responseBuffer);
				resolve(JSON.parse(responseData.toString('utf8')));
			});
		});

		expect(data).toEqual(body.response);
	});
});