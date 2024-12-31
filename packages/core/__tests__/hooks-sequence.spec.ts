import { HTTPController, HTTPRequest, HTTPResponse } from '@deot/http-core';

// onRequest, onResponse, onStart, onFinish
describe('hooks-sequence', () => {
	it('basic', async () => {
		const keys = ['onRequest', 'onResponse', 'onStart', 'onFinish'];
		const result: string[] = [];
		const globals = keys.reduce((pre, key) => {
			pre[key] = [
				() => {
					result.push(`${key}: global default - 1`);
				},
				() => {
					result.push(`${key}: global default - 2`);
				}
			];
			return pre;
		}, {});

		const selfs = keys.reduce((pre, key) => {
			pre[key] = [
				() => {
					result.push(`${key}: self default - 1`);
				},
				() => {
					result.push(`${key}: self default - 2`);
				}
			];
			return pre;
		}, {});
		const Network = new HTTPController({
			provider: (request: HTTPRequest) => {
				return new Promise((resolve) => {
					resolve(new HTTPResponse({ body: request.body }));
				});
			},
			...globals
		});

		await Network.http('xxx', {
			...selfs
		});
		const expects = ['onStart', 'onRequest', 'onResponse', 'onFinish'].reduce((pre, key) => {
			pre.push(`${key}: self default - 1`);
			pre.push(`${key}: self default - 2`);
			pre.push(`${key}: global default - 1`);
			pre.push(`${key}: global default - 2`);
			return pre;
		}, [] as string[]);
		expect(result).toEqual(expects);
	});

	it('enforce', async () => {
		const keys = ['onRequest', 'onResponse', 'onStart', 'onFinish'];
		const result: string[] = [];
		const globals = keys.reduce((pre, key) => {
			pre[key] = [
				() => {
					result.push(`${key}: global default - 1`);
				},
				{
					enforce: 'pre',
					handler: () => {
						result.push(`${key}: global - pre`);
					}
				},
				() => {
					result.push(`${key}: global default - 2`);
				},
				{
					enforce: 'post',
					handler: () => {
						result.push(`${key}: global - post`);
					}
				}
			];
			return pre;
		}, {});

		const selfs = keys.reduce((pre, key) => {
			pre[key] = [
				() => {
					result.push(`${key}: self default - 1`);
				},
				{
					enforce: 'pre',
					handler: () => {
						result.push(`${key}: self - pre`);
					}
				},
				() => {
					result.push(`${key}: self default - 2`);
				},
				{
					enforce: 'post',
					handler: () => {
						result.push(`${key}: self - post`);
					}
				}
			];
			return pre;
		}, {});
		const Network = new HTTPController({
			provider: (request: HTTPRequest) => {
				return new Promise((resolve) => {
					resolve(new HTTPResponse({ body: request.body }));
				});
			},
			...globals
		});

		await Network.http('xxx', {
			...selfs
		});
		const expects = ['onStart', 'onRequest', 'onResponse', 'onFinish'].reduce((pre, key) => {
			/**
			 * 允许self/global前置、后置
			 */
			pre.push(`${key}: self - pre`);
			pre.push(`${key}: global - pre`);
			pre.push(`${key}: self default - 1`);
			pre.push(`${key}: self default - 2`);
			pre.push(`${key}: global default - 1`);
			pre.push(`${key}: global default - 2`);

			pre.push(`${key}: self - post`);
			pre.push(`${key}: global - post`);
			return pre;
		}, [] as string[]);

		expect(result).toEqual(expects);
	});
});
