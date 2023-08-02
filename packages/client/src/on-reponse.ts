import type { HTTPHook } from '@deot/http-core';

export const onResponse: HTTPHook = (leaf) => {
	return leaf;
};