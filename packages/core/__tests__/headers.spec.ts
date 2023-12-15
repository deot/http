import { HTTPHeaders } from '@deot/http-core';

describe('headers.ts', () => {
	it('basic', () => {
		const headers = new HTTPHeaders({
			b: 'b'
		});

		headers.set('c', 'c');
		expect(headers.has('a')).toBe(false);
		expect(headers.has('b')).toBe(true);
		expect(headers.get('b')).toBe('b');
		expect(headers.toJSON()).toEqual({ b: 'b', c: 'c' });

		headers.set('c', null, false);
		expect(headers.toJSON()).toEqual({ b: 'b', c: 'c' });

		headers.set('c', null, true);
		expect(headers.toJSON()).toEqual({ b: 'b' });

		headers.set({ b: null });
		expect(headers.toJSON()).toEqual({ b: 'b' });

		headers.set({ b: null }, true);
		expect(headers.toJSON()).toEqual({});

		expect(Object.prototype.toString.call(headers)).toBe(`[object HTTPHeaders]`);
	});
});
