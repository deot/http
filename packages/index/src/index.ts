import type { HTTPController, HTTPRequestOptions } from "@deot/http-core";
import * as ServerAdapter from "@deot/http-server";
import * as ClientAdapter from "@deot/http-client";

interface Adapter {
	createInstance: (options: HTTPRequestOptions) => HTTPController;
	Network: HTTPController;
}

let adapter: Adapter;
if (typeof process !== 'undefined' && typeof window === 'undefined') {
	adapter = ServerAdapter;
} else {
	adapter = ClientAdapter;
}

export const createInstance = adapter.createInstance;
export const Network = adapter.Network;
