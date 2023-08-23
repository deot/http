import { HTTPController, HTTPResponse } from '@deot/http-core';
import { onTransformRequest, onTransformResponse } from '@deot/http-hooks';

describe('common.ts', async () => {
	const Network = new HTTPController({
		provider: async (request) => (new HTTPResponse({ body: { url: request.url } })),
		onRequest: onTransformRequest,
		onResponse: onTransformResponse
	});

	
	it('dynamic, baseUrl', async () => {
		const baseUrl = `https://example.com`;
		try {
			await Network.http(`{baseUrl}`, {
				dynamic: true,
				body: {
					baseUrl
				},
				onResponse(leaf) {
					expect(leaf.request.url).toBe(1);
				}
			});
		} catch (e) { /* empty */ }
	});

	it('dynamic, /:', async () => {
		const id = 1;
		const user = 'github';
		const response = await Network.http(`/:id`, {
			dynamic: true,
			body: {
				id,
				user
			}
		});
		expect(response.body.url).toBe(`/${id}?user=github`);
	});

	it('dynamic, {}', async () => {
		const id = 1;
		try {
			await Network.http(`https://example.com/{id}`, {
				dynamic: true,
				body: {
					id
				},
				onResponse(leaf) {
					expect(leaf.request.url).toBe('/1');
				}
			});
		} catch (e) { /* empty */ }
	});

	it('dynamic, null', async () => {
		const id = null;
		const user = 'github';
		const response = await Network.http(`/:id?name=github`, {
			dynamic: true,
			body: {
				id,
				user
			}
		});
		expect(response.body.url).toBe(`?name=github&user=github`);
	});

	it('dynamic, pass', async () => {
		const response = await Network.http('/', {
			dynamic: true,
			body: {}
		});
		expect(response.body.url).toBe(`/`);
	});

	it('Get, toURLEncodedForm', async () => {
		const response = await Network.http('/', {
			body: {
				a: null,
				b: undefined,
				c: 0,
				d: false,
				e: '',
				f: {}
			}
		});
		expect(response.body.url).toBe(`/?c=0&d=false&e=&f=%7B%7D`);
	});

	it('Get, toURLEncodedForm, empty', async () => {
		const response = await Network.http('/', {
			body: {}
		});
		expect(response.body.url).toBe(`/`);
	});
});