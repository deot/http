import { Utils } from '@deot/http';

describe('index.ts', () => {
	it('any', () => {
		expect(typeof Utils).toBe('object');
	});
});
