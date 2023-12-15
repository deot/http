import { HTTPRequest } from '@deot/http-core';

describe('request.ts', () => {
	it('basic', () => {
		const request = new HTTPRequest('', { allowExtraKey: true });
		expect(request.body).toBe(null);

		// extra value
		expect(request.allowExtraKey).toBe(true);
	});
});
