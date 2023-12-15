import { createInstance } from '@deot/http-client';
import * as Server from './fixtures/server';

// @vitest-environment jsdom
describe('xhr.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createInstance({
		credentials: 'omit',
		useXHR: true
	});

	it('Get', async () => {
		const response = await Network.http(serverUrl);
		expect(typeof response.headers['content-length']).toBe('string');
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

		expect(response.body.url).toBe('/');
		expect(response.body.method).toBe('GET');
		expect(response.status).toBe(200);
		expect(response.statusText).toBe('');
		expect(response.type).toBe('default');
		expect(response.ok).toBe(true);
		expect(response.redirected).toBe(false);
	});

	it('responseType: json, error', async () => {
		expect.hasAssertions();
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

	it('headers', async () => {
		const headers = {};
		// eslint-disable-next-line no-proto
		(headers as any).__proto__['Cookie'] = 'any';
		(headers as any)['Cookies'] = '';
		await Network.http(`${serverUrl}`, {
			headers
		});
	});

	it('progress', async () => {
		expect.assertions(2);
		await Network.http(`${serverUrl}`, {
			method: 'POST',
			body: {
				response: {
					status: 1,
					data: {}
				}
			},
			onDownloadProgress(e: any) {
				expect(e.isTrusted).toBe(true);
			},
			onUploadProgress(e: any) {
				expect(e.isTrusted).toBe(true);
			}
		});
	});
});
