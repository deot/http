import type { HTTPHook } from '@deot/http-core';

export const onRequest: HTTPHook = (leaf) => {
	return leaf;
};