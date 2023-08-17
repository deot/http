import { Network, createInstance } from '@deot/http';
import * as Adapter from '../src/index.browser';

// @vitest-environment jsdom
describe('browser.ts', () => {
	it('basic', () => {
		expect(typeof Adapter.Network !== 'undefined').toBe(true);
		expect(typeof Adapter.createInstance !== 'undefined').toBe(true);

		expect(typeof Network !== 'undefined').toBe(true);
		expect(typeof createInstance !== 'undefined').toBe(true);
	});
});
