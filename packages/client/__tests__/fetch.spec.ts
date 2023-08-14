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
});