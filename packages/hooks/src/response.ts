import type { HTTPHook } from '@deot/http-core';
import * as Is from '@deot/helper-is';

export const onTransformResponse: HTTPHook = (leaf) => {
	let { body } = leaf.response!;
	if (Is.string(body)) {
		try {
			body = JSON.parse(body as string);
		} catch { /* empty */ }
	}

	leaf.response!.body = body;
	return leaf;
};