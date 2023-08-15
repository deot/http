import { createHTTPClient } from '@deot/http-client';
import * as Server from './fixtures/server';

describe('fetch.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createHTTPClient({
		credentials: 'omit'
	});

	it('Get', async () => {
		const response = await Network.http(serverUrl);
		expect(response.body.url).toBe('/');
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

	it('Delete', async () => {
		const body = {
			response: {
				status: 1,
				data: {}
			}
		};
		const response = await Network.http(serverUrl, { 
			method: 'DELETE',
			body
		});

		expect(response.body).toEqual(body.response);
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
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
			await Network.http(serverUrl, { 
				method: 'PUT',
				timeout: 100
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_REQUEST_TIMEOUT');
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

	it('responseType: any', async () => {
		const response = await Network.http(serverUrl, {
			responseType: 'any'
		});

		expect(response.body instanceof Response).toBe(true);
	});

	it('responseType: json, error', async () => {
		try {
			await Network.http(serverUrl, {
				method: 'POST',
				body: {
					response: 'not json'
				},
				responseType: 'json'
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_RESPONSE_PARSING_FAILED');
		}
	});

	it('responseType: json, success', async () => {
		expect.assertions(0);
		try {
			await Network.http(serverUrl, {
				method: 'POST',
				body: {
					response: {}
				},
				responseType: 'json'
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_RESPONSE_PARSING_FAILED');
		}
	});

	it('server: 500', async () => {
		try {
			await Network.http(`${serverUrl}/500`);
		} catch (e: any) {
			expect(e.status).toBe(500);
		}
	});
});