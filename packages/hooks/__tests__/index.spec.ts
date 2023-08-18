import { onTransformRequest, onTransformResponse } from '@deot/http-hooks';

describe('index.ts', () => {
	it('Basic', () => {
		expect(typeof onTransformRequest).toBe('function');
		expect(typeof onTransformResponse).toBe('function');
	});
});