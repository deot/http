import { createHTTPClient } from '@deot/http-client';
import * as Server from './fixtures/server';

describe('index.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createHTTPClient({
		credentials: 'omit'
	});

	it('fetch', async () => {
		try {
			const response = await Network.http(serverUrl);

			console.log(response);
		} catch (e) {
			console.log(e);
		}
	});

	it('fetch, Post', async () => {
		try {
			const response = await Network.http(serverUrl, { 
				method: 'POST',
				body: {
					response: {
						status: 1,
						data: {}
					}
				} 
			});

			console.log(response);
		} catch (e) {
			console.log(e);
		}
	});

	it('xhr', async () => {
		try {
			const response = await Network.http(serverUrl, { useXHR: true });

			console.log(response);
		} catch (e) {
			console.log(e);
		}
	});
});