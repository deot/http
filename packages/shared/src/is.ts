/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable valid-typeof */
export const type = (value: any, type: string) => typeof value === type;
export const instance = (value: any, constructor: Function | string) => {
	return typeof constructor === 'function' 
		? value instanceof constructor
		: Object.prototype.toString.call(value) === `[object ${constructor}]`;
};

export const nil = (value) => value === null;
export const undef = (value) => type(value, 'undefined');
export const string = (value) => type(value, 'string');
export const fn = (value) => type(value, 'function');
export const number = (value) => type(value, 'number');
export const bool = value => value === true || value === false;

export const array = Array.isArray;
export const arrayBuffer = (value) => instance(value, 'ArrayBuffer');
export const arrayBufferView = (value) => {
	let result;
	if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
		result = ArrayBuffer.isView(value);
	} else {
		result = (value) && (value.buffer) && (arrayBuffer(value.buffer));
	}
	return result;
};

export const date = (value) => instance(value, 'Date');
export const blob = (value) => instance(value, 'Blob');
export const file = (value) => instance(value, 'File');
export const files = (value) => instance(value, 'FileList');
export const params = (value) => instance(value, 'URLSearchParams');
export const regexp = (value) => instance(value, 'RegExp');
export const formEl = (value) => instance(value, 'HTMLFormElement');
export const formData = (value) => instance(value, 'FormData');
export const object = (value) => !nil(value) && type(value, 'object');
export const buffer = (value) => !nil(value) && !undef(value) && value.constructor?.isBuffer?.(value);
export const stream = (value) => object(value) && fn(value.pipe);

export const plainObject = (value) => {
	if (instance(value, 'Object')) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return (
		prototype === null 
		|| prototype === Object.prototype 
		|| Object.getPrototypeOf(prototype) === null
	) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
};