import type { HTTPHook } from './request';

const timestamp = +(new Date());

let index = 0;

export const getUid = (prefix: string) => {
	return `${prefix}-${timestamp}-${++index}`;
};

const getHookSeq = (hook: HTTPHook) => {
	let i = 0;
	if (typeof hook === 'object') {
		i = (hook as any).enforce === 'pre' ? -1 : 1;
	}
	return i;
};

export const sortHooks = (v: HTTPHook[]) => {
	return v
		.toSorted(((a, b) => getHookSeq(a) - getHookSeq(b)))
		.map((i) => {
			if (typeof i === 'object') return (i as any).handler;
			return i;
		});
};
