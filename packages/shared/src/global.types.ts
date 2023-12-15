export type Indexable<T = any> = {
	[key: string]: T;
};

export type Hash<T> = Indexable<T>;

// 默认值any
export type Options<T = {}> = Indexable & T;

export interface AnyFunction<T = void> {
	(...args: any[]): T;
}

export type Nullable<T> = T | null;
export type Customized<Origin = any, Extend = any> = Origin & Extend;
export type TimeoutHandle = ReturnType<typeof global.setTimeout>;
