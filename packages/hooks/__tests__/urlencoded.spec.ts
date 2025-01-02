import { HTTPController, HTTPResponse } from '@deot/http-core';
import { onRequest, onResponse } from '@deot/http-hooks';

describe('urlencoded.ts', async () => {
	const Network = new HTTPController({
		provider: async request => (new HTTPResponse({ body: { url: request.url } })),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		onRequest,
		onResponse: [
			onResponse,
			(leaf) => {
				leaf.response!.body = typeof leaf.request.body === 'string'
					? decodeURIComponent(leaf.request.body as string)
					: leaf.request.body;
			}
		]
	});

	it('Post, Array', async () => {
		const response = await Network.http(`/`, {
			method: 'POST',
			body: [1, 2, { a: 'a' }, [4, 5]],
		});

		expect(response.body).toBe('0=1&1=2&2={"a":"a"}&3=4,5');
	});

	it('Post, Record<string, any>', async () => {
		const response = await Network.http(`/`, {
			method: 'POST',
			body: {
				a: [1, 2],
				b: {
					c: {
						d: 1
					}
				},
				c: undefined,
				d: null
			},
		});

		expect(response.body).toBe('a=1,2&b={"c":{"d":1}}');
	});

	it('Post, Record<string, any>', async () => {
		const response = await Network.http(`/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'multipart/form-data'
			},
			body: {
				a: [1, 2],
				b: {
					c: {
						d: 1
					}
				},
				c: undefined,
				d: null
			},
		});

		expect(response.body.get('a')).toBe('1,2');
		expect(response.body.get('b')).toBe('{"c":{"d":1}}');
		expect(response.body.get('c')).toBe(null);
		expect(response.body.get('d')).toBe(null);
	});
});
