import { createHTTPServer } from '@deot/http-server';

describe('index.ts', async () => {
	const Network1 = createHTTPServer({
		onRequest: [() => {}, () => {}],
		onResponse: [() => {}, () => {}]
	});

	const Network2 = createHTTPServer({
		onRequest: () => {},
		onResponse: () => {}
	});

	const Network3 = createHTTPServer();

	it('length', async () => {
		expect(Network1.request.onRequest.length).toBe(3);
		expect(Network2.request.onResponse.length).toBe(2);
		expect(Network3.request.onRequest.length).toBe(1);
		expect(Network3.request.onResponse.length).toBe(1);
	});
});