import { HTTPController } from "@deot/http-core";
import type { HTTPRequestOptions } from "@deot/http-core";
import { provider } from "./provider";
import { onRequest } from './on-request';
import { onResponse } from './on-reponse';

export const createHttpClient = (options: HTTPRequestOptions = {}) => {
	const client = new HTTPController({
		...options,
		onRequest: [onRequest].concat(options.onRequest || []),
		onResponse: [onResponse].concat(options.onResponse || []),
		provider
	});

	return client;
};

export const Network = createHttpClient({} as HTTPRequestOptions);