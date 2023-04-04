import type { AnyFunction } from '@deot/http-shared';

describe('global.types.ts', () => {
	it('dts', () => {
		type DTS = { 
			fn?: AnyFunction;
		};

		const options: DTS = {};
		expect(typeof options).toBe('object');
	});
});