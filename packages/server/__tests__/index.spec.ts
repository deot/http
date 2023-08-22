import { createInstance } from '@deot/http-server';

describe('index.ts', async () => {
	const Network1 = createInstance({
		onRequest: [() => {}, () => {}],
		onResponse: [() => {}, () => {}]
	});

	const Network2 = createInstance({
		onRequest: () => {},
		onResponse: () => {}
	});

	const Network3 = createInstance();

	it('length', async () => {
		expect(Network1.request.onRequest.length).toBe(4);
		expect(Network2.request.onResponse.length).toBe(2);
		expect(Network3.request.onRequest.length).toBe(2);
		expect(Network3.request.onResponse.length).toBe(1);
	});
});