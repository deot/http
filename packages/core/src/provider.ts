import type { HTTPRequest } from "./request";
import type { HTTPResponse } from "./response";

export interface HTTPProvider {
	(request: HTTPRequest): Promise<HTTPResponse>;
}