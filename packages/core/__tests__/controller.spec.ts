import { HttpController, HttpRequest, HttpResponse } from '@deot/http-core';
import type { HttpControllerOptions } from '@deot/http-core';

describe('controller.ts', () => {
	const Network = new HttpController({
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

	it('error, empty provider', async () => {
		expect.assertions(1);
		try {
			// eslint-disable-next-line no-new
			new HttpController({} as HttpControllerOptions);
		} catch (e: any) {
			expect(e.message).toMatch(`provider is required`);
		}
	});

	it('error, empty apis coverage', async () => {
		// eslint-disable-next-line no-new
		new HttpController({ provider: {} } as HttpControllerOptions);
		expect(1).toBe(1);
	});

	it('error, empty url', async () => {
		expect.assertions(6);

		try {
			await Network.http('', {});
		} catch (e: any) {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_URL_EMPTY');
			expect(Network.shells.length).toBe(0);
		}
	});

	it('error, empty url', async () => {
		expect.assertions(6);

		try {
			await Network.http('xxx', {});
		} catch (e: any) {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_URL_EMPTY');
			expect(Network.shells.length).toBe(0);
		}
	});

	it('success, body', async () => {
		const response = await Network.http('A_GET', {
			body: {}
		});

		expect(Network.shells.length).toBe(0);
		expect(response.body).toEqual({});
	});

	it('success, body, query', async () => {
		const response = await Network.http('A_GET?token=1', {
			body: {}
		});

		expect(Network.shells.length).toBe(0);
		expect(response.body).toEqual({});
	});

	it('timeout', async () => {
		expect.assertions(6);
		try {
			await Network.http('A_GET', {
				timeout: 100
			});
		} catch (e: any) {
			expect(Network.shells.length).toBe(0);
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_REQUEST_TIMEOUT');
		}
	});

	it('timeout, unlimited', async () => {
		const response = await Network.http('A_GET', {
			timeout: 0
		});
		expect(response.body).toEqual(null);
	});

	it('cancel', async () => {
		expect.assertions(10);
		const shell = Network.custom('A_GET');
		shell.send((leaf) => {
			expect(typeof leaf.id).toBe('string');
		}).catch((e) => {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		expect(Network.shells.length).toBe(1);
		expect(Object.keys(shell.leafs).length).toBe(1);

		await shell.cancel();
		shell.cancel('any'); // skip, coverage
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by controller', async () => {
		expect.assertions(3);
		const shell = Network.custom('A_GET');
		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});
		await Network.cancel();
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by controller, leaf', async () => {
		expect.assertions(3);
		const shell = Network.custom('A_GET');
		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		const leaf = Object.values(shell.leafs)[0];
		await Network.cancel(leaf);
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by controller, multiple send', async () => {
		expect.assertions(4);
		const shell = Network.custom('A_GET');
		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});
		
		await Network.cancel();
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('send, get leaf', async () => {
		expect.assertions(3);
		const shell = Network.custom('A_GET');
		const leaf = shell.send(true);

		leaf.target.catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});
		
		await Network.cancel();
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('localData', async () => {
		expect.assertions(1);
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('A_GET', {
			localData: body
		});

		expect(response.body).toBe(body);
	});

	it('onAfter, error', async () => {
		expect.assertions(1);
		const message = new Error('any');
		try {
			await Network.http('A_GET', {
				onAfter() {
					throw message;
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(message);
		}
	});

	it('onAfter, success', async () => {
		expect.assertions(1);
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('A_GET', {
			onAfter() {
				return { body };
			}
		});

		expect(response.body).toBe(body);
	});

	it('onAfter, error, HttpResponse', async () => {
		expect.assertions(1);
		const body = {
			status: 1,
			data: {}
		};
		try {
			await Network.http('A_GET', {
				onAfter() {
					return new HttpResponse({ body, type: 'error' });
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(body);
		}
	});

	it('onBefore, error', async () => {
		expect.assertions(1);
		const message = new Error('any');
		try {
			await Network.http('A_GET', {
				onBefore() {
					throw message;
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(message);
		}
	});

	it('onBefore, success', async () => {
		expect.assertions(1);
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('A_GET', {
			onBefore() {
				return { localData: body };
			}
		});

		expect(response.body).toBe(body);
	});

	it('onBefore, success, HttpResponse', async () => {
		expect.assertions(1);
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('A_GET', {
			onBefore() {
				return new HttpRequest({ localData: body });
			}
		});

		expect(response.body).toBe(body);
	});

	it('onLoading/onLoaded', async () => {
		expect.assertions(2);
		try {
			await Network.http('A_GET', {
				onBefore() {
					throw new Error('any');
				},
				onLoading() {
					expect(1).toBe(1);
				},
				onLoaded() {
					expect(1).toBe(1);
				}
			});
		} catch (e) {
			// any
		}
	});

	it('maxTries', async () => {
		let count = 0;
		let maxTries = 10;
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('A_GET', {
			maxTries,
			interval: 2,
			onBefore() {
				count++;
				if (count < maxTries) {
					throw new Error('any');
				} else {
					return { localData: body };
				}
			}
		});

		expect(count).toBe(10);
		expect(response.body).toBe(body);
	});
});