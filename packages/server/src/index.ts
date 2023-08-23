import { HTTPController } from "@deot/http-core";
import type { HTTPRequestOptions } from "@deot/http-core";
import { onRequest, onResponse } from '@deot/http-hooks';
import { onRequest as onRequestForServer } from './on-request';
import { provider } from "./provider";

export const createInstance = (options: HTTPRequestOptions = {}) => {
	const onBaseRequest = (Array.isArray(options.onRequest) ? options.onRequest : (options.onRequest ? [options.onRequest] : []));
	const onBaseResponse = (Array.isArray(options.onResponse) ? options.onResponse : (options.onResponse ? [options.onResponse] : []));
	const client = new HTTPController({
		...options,
		onRequest: onBaseRequest.concat([onRequest, onRequestForServer]),
		onResponse: [onResponse].concat(onBaseResponse),
		provider
	});

	return client;
};

export const Network = createInstance({} as HTTPRequestOptions);