import { onRequest, onResponse } from '@deot/http-hooks';

describe('index.ts', () => {
	it('Basic', () => {
		expect(typeof onRequest).toBe('function');
		expect(typeof onResponse).toBe('function');
	});
});
