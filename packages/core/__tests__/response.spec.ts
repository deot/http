import { HTTPResponse } from '@deot/http-core';

describe('response.ts', () => {
	it('basic', () => {
		const response = new HTTPResponse({ allowExtraKey: true });
		expect(response.body).toBe(null);
		expect(response.ok).toBe(true);
		expect(response.status).toBe(200);

		// extra value
		expect(response.allowExtraKey).toBe(true);
	});
});
