import { createHTTPClient } from '@deot/http-client';
import * as Server from './fixtures/server';

describe('jsonp.ts', async () => {
	const serverUrl = await Server.impl();
	const Network = createHTTPClient({
		credentials: 'omit'
	});

	it('error 1', async () => {
		try {
			const jsonp = 'atob';
			await Network.http(`${serverUrl}/jsonp/${jsonp}`, {
				jsonp
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_CODE_ILLEGAL');
		}
	});

	it('error 1', async () => {
		try {
			const jsonp = {};
			await Network.http(`${serverUrl}/jsonp/${jsonp}`, {
				jsonp
			});
		} catch (e: any) {
			expect(e.statusText).toBe('HTTP_CODE_ILLEGAL');
		}
	});

	it('Get', async () => {
		const jsonp = '__init__';
		// 似乎jsdom的script src 无法加载
		try {
			await Network.http(`${serverUrl}/jsonp/${jsonp}`, {
				jsonp,
				timeout: 100
			});
		} catch (e) {
			(window as any)[jsonp]({});
		}
	});
});