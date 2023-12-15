// eslint-disable-next-line max-classes-per-file
const isServer = typeof document === 'undefined';
class FileList extends Array {
	constructor(args: any[]) {
		super();
		args?.forEach?.(i => this.push(i));
	}

	get [Symbol.toStringTag]() {
		return 'FileList';
	}

	item(index: number) {
		return this[index];
	}
}

class File extends Blob {
	name: string;

	_data: any;

	constructor(data: any, filename: string, options: any) {
		super(data, options);
		this.name = filename;
		this._data = data;
	}

	get [Symbol.toStringTag]() {
		return 'File';
	}
}

export const response = { status: 1, data: { } };
export const responseString = JSON.stringify(response);

export const json = { response };
export const string = JSON.stringify(json);
export const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
export const blobWithoutType = new Blob([JSON.stringify(json)]);
export const blobWithoutContent = new Blob();
export const file = new File([JSON.stringify(json)], 'foo.json', {
	type: 'application/json',
});

export const formData = new FormData();
formData.append('response', responseString);
formData.append('file', file, file.name);

export const form = !isServer ? document.createElement('form') : {};

if (!isServer) {
	const input = document.createElement('input');
	input.name = 'response';
	input.value = responseString;
	(form as any).appendChild(input);
}

export const params = new URLSearchParams({ response: responseString });

export const buffer = Buffer.from(string);
export const arrayBuffer = new ArrayBuffer(buffer.length);
const view = new Uint8Array(arrayBuffer);
for (let i = 0; i < buffer.length; ++i) {
	view[i] = buffer[i];
}

export const arrayBufferView = new DataView(arrayBuffer);

export const files = new FileList([file, file]);

class Custom {
	response!: any;

	constructor(v: any) {
		this.response = v;
	}

	get [Symbol.toStringTag]() {
		return 'Custom';
	}
}

export const custom = new Custom(response);
