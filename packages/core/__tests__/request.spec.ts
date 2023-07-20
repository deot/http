import { HttpRequest } from '@deot/http-core';

describe('request.ts', () => {
	it('basic', () => {
		const request = new HttpRequest('', { allowExtraKey: true });
		expect(request.body).toBe(null);

		// extra value
		expect(request.allowExtraKey).toBe(true);
	});
});