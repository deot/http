import type { HTTPController, HTTPRequestOptions } from "@deot/http-core";

interface Adapter {
	createInstance: (options: HTTPRequestOptions) => HTTPController;
	Network: HTTPController;
}

let adapter: Adapter;
if (typeof process !== 'undefined' && typeof window === 'undefined') {
	adapter = require('@deot/http-server');
} else {
	adapter = require('@deot/http-client');
}

export const createInstance = adapter.createInstance;
export const Network = adapter.Network;
