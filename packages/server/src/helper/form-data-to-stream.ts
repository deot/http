import { TextEncoder } from 'node:util';
import { Readable } from 'node:stream';
import * as Is from '@deot/helper-is';
import { generateString } from '@deot/helper-utils';
import { readBlob } from './read-blob';

const textEncoder = new TextEncoder();
const CRLF = '\r\n';
const CRLF_BYTES = textEncoder.encode(CRLF);
const CRLF_BYTES_COUNT = 2;
class FormDataPart {
	headers: any;

	contentLength: any;

	size: any;

	name: any;

	value: any;

	constructor(name: string, value: any) {
		const { escapeName } = FormDataPart;
		const isStringValue = Is.string(value);
		// eslint-disable-next-line max-len
		let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ''}${CRLF}`;
		if (isStringValue) {
			value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
		} else {
			headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
		}

		this.headers = textEncoder.encode(headers + CRLF);
		this.contentLength = isStringValue ? value.byteLength : value.size;
		this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
		this.name = name;
		this.value = value;
	}

	async* encode() {
		yield this.headers;
		const {
			value
		} = this;
		if (Is.typedArray(value)) {
			yield value;
		} else {
			yield* readBlob(value);
		}
		yield CRLF_BYTES;
	}

	static escapeName(name: string) {
		return String(name).replace(/[\r\n"]/g, (match: any) => {
			return ({
				'\r': '%0D',
				'\n': '%0A',
				'"': '%22',
			})[match];
		});
	}
}

export const formDataToStream = (form: FormData, headersHandler?: any, options?: any) => {
	const boundary = options?.boundary || 'form-data-boundary-' + generateString(25);
	
	const boundaryBytes = textEncoder.encode('--' + boundary + CRLF);
	const footerBytes = textEncoder.encode('--' + boundary + '--' + CRLF + CRLF);
	let contentLength = footerBytes.byteLength;
	const parts = Array.from((form as any).entries()).map((item: any) => {
		const [name, value] = item;
		const part = new FormDataPart(name, value);
		contentLength += part.size;
		return part;
	});

	contentLength += boundaryBytes.byteLength * parts.length;

	const computedHeaders = {
		'Content-Type': `multipart/form-data; boundary=${boundary}`
	};

	/* istanbul ignore next -- @preserve */
	if (Number.isFinite(contentLength)) {
		computedHeaders['Content-Length'] = contentLength;
	}

	headersHandler && headersHandler(computedHeaders);
	return Readable.from((async function* () {
		for (const part of parts) {
			yield boundaryBytes;
			yield* part.encode();
		}
		yield footerBytes;
	})());
};
export default formDataToStream;