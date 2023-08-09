import { HTTPController } from "@deot/http-core";
import type { HTTPRequestOptions } from "@deot/http-core";
import { onTransformRequest, onTransformResponse } from '@deot/http-hooks';
import { provider } from "./provider";

export const createHttpClient = (options: HTTPRequestOptions = {}) => {
	const onBaseRequest = (Array.isArray(options.onRequest) ? options.onRequest : (options.onRequest ? [options.onRequest] : []));
	const onBaseResponse = (Array.isArray(options.onResponse) ? options.onResponse : (options.onResponse ? [options.onResponse] : []));
	const client = new HTTPController({
		...options,
		onRequest: onBaseRequest.concat([onTransformRequest]),
		onResponse: [onTransformResponse].concat(onBaseResponse),
		provider
	});

	return client;
};

export const Network = createHttpClient({} as HTTPRequestOptions);