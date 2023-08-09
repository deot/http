/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable valid-typeof */
export const type = (v: any, type: string) => typeof v === type;
export const instance = (v: any, constructor: Function | string) => {
	return typeof constructor === 'function' 
		? v instanceof constructor
		: Object.prototype.toString.call(v) === `[object ${constructor}]`;
};

export const nil = (v: any) => v === null;
export const undef = (v: any) => type(v, 'undefined');
export const string = (v: any) => type(v, 'string');
export const fn = (v: any) => type(v, 'function');
export const number = (v: any) => type(v, 'number');
export const bool = (v: any) => v === true || v === false;

export const array = Array.isArray;
export const arrayBuffer = (v: any) => instance(v, 'ArrayBuffer');
export const arrayBufferView = (v: any) => {
	let result: boolean;
	if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
		result = ArrayBuffer.isView(v);
	} else {
		result = (v) && (v.buffer) && (arrayBuffer(v.buffer));
	}
	return result;
};

export const date = (v: any) => instance(v, 'Date');
export const blob = (v: any) => instance(v, 'Blob');
export const file = (v: any) => instance(v, 'File');
export const files = (v: any) => instance(v, 'FileList');
export const params = (v: any) => instance(v, 'URLSearchParams');
export const regexp = (v: any) => instance(v, 'RegExp');
export const formEl = (v: any) => instance(v, 'HTMLFormElement');
export const formData = (v: any) => instance(v, 'FormData');
export const object = (v: any) => !nil(v) && type(v, 'object');
export const buffer = (v: any) => !nil(v) && !undef(v) && v.constructor?.isBuffer?.(v);
export const stream = (v: any) => object(v) && fn(v.pipe);

export const plainObject = (v: any) => {
	if (!instance(v, 'Object')) {
		return false;
	}
	const prototype = Object.getPrototypeOf(v);
	return (
		prototype === null 
		|| prototype === Object.prototype 
		|| Object.getPrototypeOf(prototype) === null
	) && !(Symbol.toStringTag in v) && !(Symbol.iterator in v);
};