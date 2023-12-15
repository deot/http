import { createInstance } from '@deot/http-client';
import * as Server from './fixtures/server';

describe('limit.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createInstance({
		credentials: 'omit',
		onResponse(leaf) {
			const { body } = leaf.response!;

			if (
				!body
				|| (body && typeof body.status !== 'number')
			) {
				leaf.response!.statusText = `response.body must be a json.`;
				leaf.response!.type = 'error';
				leaf.response!.body = {
					status: 0,
					message: leaf.response!.statusText
				};

				// or throw ({ status: 0, message: '' });
			}

			if (body.status === -1) {
				Network.cancel();
				return;
			}

			if (body.status !== 1) {
				leaf.response!.statusText = `response.body pass by \`status = 1\``;
				leaf.response!.type = 'error';

				// or throw body;
			}
		}
	});

	it('then, pass by status: 1', async () => {
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

	it('catch, status: 0', async () => {
		const body = {
			response: {
				status: 0,
				data: {}
			}
		};
		try {
			await Network.http(serverUrl, {
				method: 'POST',
				body
			});
		} catch (response: any) {
			expect(response.statusText).toBe('response.body pass by `status = 1`');
		}
	});

	it('cancel all, status: -1', async () => {
		const body = {
			response: {
				status: -1,
				data: {}
			}
		};
		try {
			await Network.http(serverUrl, {
				method: 'POST',
				body
			});
		} catch (response: any) {
			expect(response.statusText).toBe('HTTP_CANCEL');
		}
	});
});
