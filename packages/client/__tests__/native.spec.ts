import { E2E } from '@deot/dev-test';
import { resolve } from 'node:path';
import * as Server from './fixtures/server';

describe.skip('request.ts', async () => {
	const serverUrl = await Server.impl();
	const launch = E2E.impl();
	const baseUrl = `file://${resolve(__dirname, './fixtures/native.html')}`;
	const methods = [
		'string',
		'blob',
		'file',
		'formData',
		'arrayBuffer',
		'files',
		'URLSearchParams'
	];

	it('fetch / xhr', async () => {
		expect.assertions(methods.length * 2);
		const { page, operater } = launch;
		await page.goto(`${baseUrl}`);

		await ['fetch', 'xhr'].reduce((task, id) => {
			task = task.then(() => {
				return methods.reduce((task$, type) => {
					const api = `${serverUrl}/${type}`;
					task$ = task$
						.then(() => operater.setValue(`#${id}`, api))
						.then(() => page.waitForResponse(v => v.url() === api))
						.then(e => e.json())
						.then((e) => {
							expect(e).toEqual({ status: 1, data: {} });
						});
					return task$;
				}, Promise.resolve());
			});
			return task;
		}, Promise.resolve());
	});
});
