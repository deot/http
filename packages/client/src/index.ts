import { HttpController } from "@deot/http-core";
import type { HttpControllerOptions } from "@deot/http-core";

export const createHttpClient = (options: HttpControllerOptions) => {
	const client = new HttpController({
		// provider
		...options
	});

	return client;
};

export const Network = createHttpClient({} as HttpControllerOptions);