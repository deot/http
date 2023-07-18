import type { HttpRequest } from "./request";
import type { HttpResponse } from "./response";

export interface HttpProvider {
	(request: HttpRequest): Promise<HttpResponse>;
}