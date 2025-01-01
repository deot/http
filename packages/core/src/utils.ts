import type { HTTPHook } from './request';
import type { HTTPShellLeaf } from './shell-leaf';

const timestamp = +(new Date());

let index = 0;

export const getUid = (prefix: string) => {
	return `${prefix}-${timestamp}-${++index}`;
};

const getHookSeq = (hook: HTTPHook) => {
	let i = 0;
	if (typeof hook === 'object' && (hook as any).enforce) {
		i = (hook as any).enforce === 'pre' ? -1 : 1;
	}
	return i;
};

/**
 * 排序钩子执行顺序
 *
 * - 带有`enforce: 'pre'`的用户钩子
 * - 带有`enforce: 'pre'`的全局钩子
 * - 没有`enforce`的用户钩子
 * - 没有`enforce`的全局钩子
 * - 带有`enforce: 'post'`的用户钩子
 * - 带有`enforce: 'post'`的全局钩子
 * @param v 未排序的钩子
 * @returns 排序过的钩子
 */
export const sortHooks = <T>(v: HTTPHook<T>[]): Array<(leaf: HTTPShellLeaf) => T> => {
	return v
		.toSorted(((a, b) => getHookSeq(a) - getHookSeq(b)))
		.map((i) => {
			if (typeof i === 'object') return (i as any).handler;
			return i;
		});
};
