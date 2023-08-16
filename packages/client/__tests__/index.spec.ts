import { createInstance } from '@deot/http-client';

describe('index.ts', async () => {
	const Network1 = createInstance({
		credentials: 'omit',
		onRequest: [() => {}, () => {}],
		onResponse: [() => {}, () => {}]
	});

	const Network2 = createInstance({
		credentials: 'omit',
		onRequest: () => {},
		onResponse: () => {}
	});

	const Network3 = createInstance();

	it('length', async () => {
		expect(Network1.request.onRequest.length).toBe(3);
		expect(Network2.request.onResponse.length).toBe(2);
		expect(Network3.request.onRequest.length).toBe(1);
		expect(Network3.request.onResponse.length).toBe(1);
	});
});