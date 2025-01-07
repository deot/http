import { Utils } from '@deot/dev-test';
import { HTTPController, HTTPRequest, HTTPResponse } from '@deot/http-core';

describe('controller.ts', () => {
	const Network = new HTTPController({
		provider: (request: HTTPRequest) => {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					request.reject
						? reject(HTTPResponse.error('', request))
						: resolve(new HTTPResponse({ body: request.body }));
				}, 20);
			});
		}
	});

	it('default', async () => {
		const controller = new HTTPController();
		const body = {};
		const response = await controller.http('xxx', { body });
		expect(response.body).toEqual(body);
	});

	it('baseURL/apis', async () => {
		expect.hasAssertions();
		const baseURL = 'https://xxx.com';
		const apis = {
			A_GET: '/api.json'
		};
		const controller = new HTTPController({
			onRequest(leaf) {
				const request = new HTTPRequest(leaf.request);
				if (request.url && !/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
					const [key, query] = request.url.split('?'); // 避免before带上?token=*之类
					request.url = `${apis[key] ? `${baseURL}${apis[key]}` : ''}${query ? `?${query}` : ''}`;
				}

				return request;
			},
			async provider(request) {
				expect(request.url).toBe(baseURL + apis['A_GET']);
				return new HTTPResponse();
			}
		});
		const body = {};
		await controller.http('A_GET', { body });
	});

	it('error, empty url', async () => {
		expect.hasAssertions();

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

	it('success, body', async () => {
		const response = await Network.http('xxx', {
			body: {}
		});

		expect(Network.shells.length).toBe(0);
		expect(response.body).toEqual({});
	});

	it('error, body', async () => {
		expect.hasAssertions();
		try {
			await Network.http('xxx', {
				reject: true,
				body: {}
			});
		} catch (e: any) {
			expect(Network.shells.length).toBe(0);
			expect(e.body).toEqual({});
		}
	});

	it('timeout', async () => {
		expect.hasAssertions();
		try {
			await Network.http('xxx', {
				timeout: 10
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
		const response = await Network.http('xxx', {
			timeout: 0
		});
		expect(response.body).toEqual(null);
	});

	it('cancel by leaf', async () => {
		expect.assertions(9);
		const leaf = Network.http('xxx');
		leaf.catch((e) => {
			expect(e.body).toBe(null);
			expect(e.status).toBe(0);
			expect(e.ok).toBe(false);
			expect(e.type).toBe('error');
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		expect(Network.shells.length).toBe(1);
		const shell = Network.shells[0];
		expect(Object.keys(shell.leafs).length).toBe(1);

		await leaf.cancel();

		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by shell', async () => {
		expect.assertions(9);
		const shell = Network.custom('xxx');
		shell.send().catch((e) => {
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
		const shell = Network.custom('xxx');
		shell.send().catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});
		await Network.cancel();
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('cancel by controller, leaf', async () => {
		expect.assertions(3);
		const shell = Network.custom('xxx');
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
		const shell = Network.custom('xxx');
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

	it('send, leaf', async () => {
		expect.assertions(3);
		const shell = Network.custom('xxx');
		const leaf = shell.send();

		leaf.catch((e) => {
			expect(e.statusText).toBe('HTTP_CANCEL');
		});

		await Network.cancel();
		expect(Network.shells.length).toBe(0);
		expect(Object.keys(shell.leafs).length).toBe(0);
	});

	it('send, multiple', async () => {
		let count = 0;
		let record = count;
		const shell = Network.custom('xxx', {
			onStart() {
				count++;
			},
			onFinish() {
				record = count;
			}
		});
		await Promise.all(Array.from({ length: 10 }).map(() => shell.send()));

		expect(count).toBe(1);
		expect(record).toBe(1);
	});

	it('localData', async () => {
		expect.hasAssertions();
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('xxx', {
			localData: body
		});

		expect(response.body).toBe(body);
	});

	it('onResponse, error', async () => {
		expect.hasAssertions();
		const message = new Error('any');
		try {
			await Network.http('xxx', {
				onResponse() {
					throw message;
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(message);
		}
	});

	it('onResponse, success', async () => {
		expect.hasAssertions();
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('xxx', {
			onResponse() {
				return { body };
			}
		});

		expect(response.body).toBe(body);
	});

	it('onResponse, error, HttpResponse', async () => {
		expect.hasAssertions();
		const body = {
			status: 1,
			data: {}
		};
		try {
			await Network.http('xxx', {
				onResponse() {
					return new HTTPResponse({ body, type: 'error' });
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(body);
		}
	});

	it('onRequest, error', async () => {
		expect.hasAssertions();
		const message = new Error('any');
		try {
			await Network.http('xxx', {
				onRequest() {
					throw message;
				}
			});
		} catch (e: any) {
			expect(e.body).toBe(message);
		}
	});

	it('onRequest, success', async () => {
		expect.hasAssertions();
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('xxx', {
			onRequest() {
				return { localData: body };
			}
		});

		expect(response.body).toBe(body);
	});

	it('onRequest, success, HttpResponse', async () => {
		expect.hasAssertions();
		const body = {
			status: 1,
			data: {}
		};
		const response = await Network.http('xxx', {
			onRequest() {
				return new HTTPRequest({ localData: body });
			}
		});

		expect(response.body).toBe(body);
	});

	it('onStart/onFinish', async () => {
		expect.assertions(2);
		try {
			await Network.http('xxx', {
				onRequest() {
					throw new Error('any');
				},
				onStart() {
					expect(1).toBe(1);
				},
				onFinish() {
					expect(1).toBe(1);
				}
			});
		} catch (e) {
			// any
		}
	});

	it('maxTries', async () => {
		let count = 0;
		const maxTries = 10;
		const body = {
			status: 1,
			data: {}
		};

		let startCount = 0;
		let finishCount = 0;

		let record = count;
		const response = await Network.http('xxx', {
			maxTries,
			interval: 2,
			onStart() {
				startCount++;
			},
			onFinish() {
				finishCount++;
				record = count;
			},
			onRequest() {
				count++;
				if (count < maxTries) {
					throw new Error('any');
				} else {
					return { localData: body };
				}
			}
		});

		expect(startCount).toBe(1);
		expect(finishCount).toBe(1);
		expect(record).toBe(maxTries);
		expect(count).toBe(maxTries);
		expect(response.body).toBe(body);
		expect(Network.shells.length).toBe(0);
	});

	it('task/coverage', async () => {
		let count = 0;
		const body = {
			status: 1,
			data: {}
		};
		await Network.http('xxx', {
			localData: body,
			onRequest: [
				(leaf) => {
					count++;
					return leaf;
				},
				() => {
					count++;
					return false;
				},
				() => {
					count += 10;
				},
				() => {
					count += 10;
				}
			],
			onResponse: [
				(leaf) => {
					count++;
					return leaf;
				},
				() => {
					count++;
					return false;
				},
				() => {
					count += 10;
				},
				() => {
					count += 10;
				}
			],
		});

		expect(count).toBe(4);
	});

	it('leaf/finally', async () => {
		let count = 0;
		const body = {
			status: 1,
			data: {}
		};
		await Network.http('xxx', { localData: body }).finally(() => {
			count++;
		});

		expect(count).toBe(1);
	});

	it('shared', async () => {
		const shared = 'any';
		let count = 0;
		const fn = () => {
			return Network.http('xxx', {
				shared,
				onStart: () => {
					count++;
				}
			});
		};

		await Promise.all(Array.from({ length: 4 }).map(fn));
		expect(count).toBe(1);
		expect(Network.shells.length).toBe(1);

		await Network.removeShared();
		await Promise.all(Array.from({ length: 4 }).map(fn));
		expect(count).toBe(2);
		expect(Network.shells.length).toBe(1);

		await Network.removeShared(shared);
		await Promise.all(Array.from({ length: 4 }).map(fn));
		expect(count).toBe(3);
		expect(Network.shells.length).toBe(1);

		await Network.removeShared(shared);
		expect(Network.shells.length).toBe(0);
	});

	// 相同的shared，也支持参数的不同（目前是通过JSON.stringify）
	it('shared/body', async () => {
		const shared = 'any';
		let count = 0;
		const fn = (body: any) => {
			return Network.http('xxx', {
				shared,
				body,
				onStart: () => {
					count++;
				}
			});
		};

		await Promise.all(Array.from({ length: 4 }).map((_, index) => fn({ index: index % 2 })));
		expect(count).toBe(2);
		expect(Network.shells.length).toBe(2);

		await Network.removeShared();
		expect(Network.shells.length).toBe(0);
	});

	it('shared/cancel', async () => {
		const shared = 'any';
		let count = 0;
		const fn = () => {
			return Network.http('xxx', {
				shared,
				onStart: () => {
					count++;
				}
			});
		};

		const requests = Array.from({ length: 4 }).map(fn);
		await Network.cancel();
		expect(Network.shells.length).toBe(1);

		try {
			await Promise.all(requests);
		} catch (e) {
			expect(count).toBe(1);
		}
		await Network.clear();
		expect(Network.shells.length).toBe(0);
	});

	// 当失败时会清理shared
	it('shared/error', async () => {
		const shared = 'error';
		let count = 0;
		const fn = (body: any) => {
			return Network.http('xxx', {
				shared,
				body,
				reject: true,
				onStart: () => {
					count++;
				}
			});
		};

		try {
			await Promise.allSettled(Array.from({ length: 4 }).map((_, index) => fn({ index: index % 2 })));
		} catch (e) {
			expect(count).toBe(2);
			expect(Network.shells.length).toBe(0);
		};
	});

	it('shared/cancelAfterRemove', async () => {
		const shared = 'any';
		let result = '';
		try {
			await Network.http('xxx', {
				shared,
				onStart() {
					result += 'a';
				},
				onFinish() {
					result += 'b';
				},
				onResponse() {
					Network.removeShared(shared);
					Network.clear();
				}
			});
		} catch (e: any) {
			expect(result).toBe('ab');
			expect(e.statusText).toBe('HTTP_CANCEL');
		}
	});

	it('shared/coverage', async () => {
		const shared = 'any';
		let count = 0;
		const fn = () => {
			return Network.http('xxx', {
				shared,
				onStart: () => {
					count++;
				}
			});
		};

		Network.http('xxx', {
			onResponse: async () => {
				await Utils.sleep(10);
			}
		});

		await Promise.all(Array.from({ length: 4 }).map(fn));
		expect(count).toBe(1);
		expect(Network.shells.length).toBe(2);

		await Network.removeShared();
		expect(Network.shells.length).toBe(1);

		await Utils.sleep(10);
		expect(Network.shells.length).toBe(0);
	});

	it('shared/clear multiple', async () => {
		const shared = 'multiple';
		const fn = () => {
			return Network.http('xxx', {
				shared,
			});
		};
		await Promise.all(Array.from({ length: 4 }).map(fn));
		await Promise.all(Array.from({ length: 4 }).map(() => Network.removeShared(shared)));
		expect(Network.shells.length).toBe(0);
	});
});
