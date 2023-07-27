import { HTTPController } from "@deot/http-core";
import type { HTTPControllerOptions } from "@deot/http-core";

export const createHttpClient = (options: HTTPControllerOptions) => {
	const client = new HTTPController({
		// provider
		...options
	});

	return client;
};

export const Network = createHttpClient({} as HTTPControllerOptions);