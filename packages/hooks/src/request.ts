import type { HTTPHook } from '@deot/http-core';
import * as Is from '@deot/helper-is';
import { getPropByPath } from '@deot/helper-utils';

const JContentType = 'application/json'; // ['json']
const XContentType = 'application/x-www-form-urlencoded'; // ['urlencoded', 'form', 'form-data']
const MContentType = `multipart/form-data`;

/**
 * 如: { response: { status: 1 } }
 * 当前转义：response=%7B%22status%22%3A1%7D
 * axios转义：response%5Bstatus%5D=1 (reponse[status]=1)
 * @param body ~
 * @returns ~
 */
const toURLEncodedForm = (body: {}): string => {
	const results: string[] = [];
	for (const key in body) {
		/**
		 * 过滤掉值为null, undefined情况
		 */
		if (
			body[key]
			|| body[key] === false
			|| body[key] === 0
			|| body[key] === ''
		) {
			results.push(key + '=' + encodeURIComponent(Is.plainObject(body[key]) ? JSON.stringify(body[key]) : body[key]));
		}
	}

	return results.join('&');
};

export const onRequest: HTTPHook = (leaf) => {
	const { url: originalUrl, body: originaBody, headers, method, dynamic } = leaf.request;
	const type = method.toLowerCase();

	let url = originalUrl;
	let body = originaBody;
	/**
	 * 解析RESTFUL URL 或者动态的;
	 * 支持以下场景:
	 * -> /repo/{books_id}/{article_id}
	 * -> /repo/:books_id/:article_id?page={page}
	 * -> 127.0.0.1:8080/*
	 *
	 * 注：
	 * 1. 当无值会把前缀'/'一起删除，
	 * 2. 对应使用过的字段会被移除，如果是 config.article_id 会删除config下的article_id字段
	 */
	if (dynamic && Is.plainObject(body)) {
		const original = body as {};
		const regex = /(\/?{[^?\/\&]+|\/?:[^\d][^?\/\&]+)/g;

		let url$ = '';
		let pathAndSearch = url.replace(/[a-zA-z]+:\/\/[^\/{]*/, (key) => {
			url$ = key;
			return '';
		});

		if (regex.test(pathAndSearch)) {
			const delTmp: any[] = [];
			pathAndSearch = pathAndSearch.replace(regex, (key) => {
				const k = key.replace(/({|}|\s|:|\/)/g, '');
				const result = getPropByPath(original, k);

				delTmp.push(result);
				return result.v
					? `${key.indexOf('/') === 0 ? '/' : ''}${result.v}`
					: '';
			});

			delTmp.forEach(i => typeof i.o[i.k] !== 'undefined' && delete i.o[i.k]);
			url = url$ + pathAndSearch;
		}
	}

	if (['get'].includes(type) && Is.plainObject(body)) {
		const encodedForm = toURLEncodedForm(body as {});
		if (encodedForm.length > 0) {
			url += (url.includes('?') ? '&' : '?') + encodedForm;
		}

		body = null;
	} else {
		const contentType = headers.get('Content-Type') || '';
		const hasJSONContentType = contentType.includes(JContentType);

		if (Is.object(body) && Is.formEl(body)) {
			body = new FormData(body as HTMLFormElement);
		}

		// formDataToJSON
		if (Is.formData(body) && hasJSONContentType) {
			throw new Error(`expected 'json', received 'FormData', need formDataToJSON`);
		}

		if (!(
			Is.arrayBuffer(body)
			|| Is.buffer(body)
			|| Is.stream(body)
			|| Is.file(body)
			|| Is.blob(body)
			|| Is.formData(body)
			|| Is.string(body)
			|| !body
		)) {
			if (Is.arrayBufferView(body)) {
				body = (body as ArrayBufferView).buffer;
			} else if (Is.params(body)) {
				headers.set('Content-Type', XContentType, false);
				body = (body as URLSearchParams).toString();
			} else if (Is.files(body)) {
				const original = body;
				body = new FormData();
				Array.from((original as FileList)).forEach((file: File) => {
					(body as any).append('files[]', file);
				});
			} else if (Is.plainObject(body) || Is.array(body)) { // => Is.object(body)
				if (contentType.includes(XContentType)) {
					body = toURLEncodedForm(body as {});
				} else if (contentType.includes(MContentType)) {
					const original = body as {};
					body = new FormData();
					Object.keys(original).forEach((key) => {
						const args: any = [key, original[key]];
						/* istanbul ignore next -- @preserve */
						if (Is.file(args[1]) && args[1].name) {
							args.push(args[1].name);
						}

						if (Is.plainObject(args[1])) {
							args[1] = JSON.stringify(args[1]);
						}

						(body as FormData).append.apply(body, args);
					});
				} else {
					headers.set('Content-Type', JContentType, false);
					body = JSON.stringify(body);
				}
			} else {
				body = JSON.stringify(body);
			}
		}
		if (!Is.formData(body) && ['post', 'put', 'patch'].includes(type)) {
			headers.set('Content-Type', XContentType, false);
		}
	}

	if (Is.formData(body)) {
		headers.set('Content-Type', null, true);
	}

	leaf.request.url = url;
	leaf.request.body = body;
	leaf.request.headers = headers;

	return leaf;
};
