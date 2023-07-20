import { HttpController, HttpRequest, HttpResponse } from '@deot/http-core';

describe('controller.ts', () => {
	const controller = new HttpController({
		apis: {
			A_GET: 'https://xxx.com/api.json'
		},
		provider: (request: HttpRequest) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve(new HttpResponse({ body: request.body }));
				}, 300);
			});
		}
	});

	it('error, empty url', async () => {
		expect.assertions(6);

		try {
			await controller.http('xxx', {});
		} catch (e: any) {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_URL_EMPTY');
			expect(controller.shells.length).toBe(0);
		}
	});

	it('error, empty url', async () => {
		expect.assertions(6);

		try {
			await controller.http('xxx', {});
		} catch (e: any) {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_URL_EMPTY');
			expect(controller.shells.length).toBe(0);
		}
	});

	it('success, body', async () => {
		const response = await controller.http('A_GET', {
			body: {}
		});

		expect(controller.shells.length).toBe(0);
		expect(response.body).toEqual({});
	});

	it('timeout', async () => {
		expect.assertions(6);
		try {
			await controller.http('A_GET', {
				timeout: 100
			});
		} catch (e: any) {
			expect(controller.shells.length).toBe(0);
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_REQUEST_TIMEOUT');
		}
	});

	it('cancel', async () => {
		expect.assertions(10);
		const shell = controller.custom('A_GET');
		shell.send((leaf) => {
			expect(typeof leaf.id).toBe('string');
		}).catch((e) => {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		expect(controller.shells.length).toBe(1);
		expect(Object.keys(shell.leafs).length).toBe(1);

		await shell.cancel();
		expect(controller.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by controller', async () => {
		expect.assertions(3);
		const shell = controller.custom('A_GET');
		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		await controller.cancel();
		expect(controller.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});
});