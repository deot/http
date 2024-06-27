import type { HTTPHook } from '@deot/http-core';
import * as Is from '@deot/helper-is';

export const onResponse: HTTPHook = (leaf) => {
	let { body } = leaf.response!;

	if (Is.string(body)) {
		try {
			body = JSON.parse(body.toString());
		} catch (_) { /* empty */ }
	}

	leaf.response!.body = body;
	return leaf;
};
