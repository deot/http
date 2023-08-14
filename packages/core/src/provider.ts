import type { HTTPRequest } from "./request";
import type { HTTPResponse } from "./response";
import type { HTTPShellLeaf } from "./shell-leaf";

export interface HTTPProvider {
	(request: HTTPRequest, leaf: HTTPShellLeaf): Promise<HTTPResponse>;
}