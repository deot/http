/* eslint-disable no-cond-assign */
import type { HTTPHook } from '@deot/http-core';
import { Is, Utils } from './helper';

const JContentType = 'application/json'; // ['json']
const XContentType = 'application/x-www-form-urlencoded'; // ['urlencoded', 'form', 'form-data']
const MContentType = `multipart/form-data`;

/**
 * 如: { response: { status: 1 } }
 * 当前转义：response=%7B%22status%22%3A1%7D
 * axios转义：response%5Bstatus%5D=1 (reponse[status]=1)
 * @param {Record<string, any>} body ~
 * @returns {string} ~
 */
const toURLEncodedForm = (body: Record<string, any>): string => {
	const results: string[] = [];
	for (let key in body) {
		/**
		 * 过滤掉值为null, undefined情况
		 */
		if (body[key] || body[key] === false || body[key] === 0 || body[key] === '') {
			results.push(key + '=' + encodeURIComponent(Is.plainObject(body[key]) ? JSON.stringify(body[key]) : body[key]));
		}
	}

	return results.join('&');
};

export const onTransformRequest: HTTPHook = (leaf) => {
	let { url, body, headers, method, dynamic } = leaf.request;
	const type = method.toLowerCase();

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
		let original = body as Record<string, any>;
		let regex = /(\/?{[^?\/\&]+|\/?:[^\d][^?\/\&]+)/g;

		let url$ = '';
		let pathAndSearch = url.replace(/[a-zA-z]+:\/\/[^\/{]*/, (key) => {
			url$ = key || '';
			return '';
		});

		if (regex.test(pathAndSearch)) {
			let delTmp: any[] = [];
			pathAndSearch = pathAndSearch.replace(regex, key => {
				let k = key.replace(/({|}|\s|:|\/)/g, '');
				let result = Utils.getPropByPath(original, k);
				
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
		let encodedForm = toURLEncodedForm(body as Record<string, any>);
		if (encodedForm.length > 0) {
			url += (url.includes('?') ? '&' : '?') + encodedForm;
		}

		body = null;
	} else {
		const contentType = headers['Content-Type'] || '';
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
		)) {
			if (Is.arrayBufferView(body)) {
				body = (body as ArrayBufferView).buffer;
			} else if (Is.params(body)) {
				headers = {
					'Content-Type': XContentType,
					...headers
				};
				body = (body as URLSearchParams).toString();
			} else if (Is.files(body)) {
				body = new FormData();
				body.append('files[]', body);
			} else if (Is.plainObject(body)) {
				if (contentType.includes(XContentType)) {
					body = toURLEncodedForm(body as Record<string, any>);
				} else if (contentType.includes(MContentType)) {
					let original = body as Record<string, any>;
					body = new FormData();
					Object.keys(original).forEach((key) => {
						(body as FormData).append(key, original[key]);
					});
				} else {
					headers = {
						'Content-Type': JContentType,
						...headers
					};
					body = Utils.stringifySafely(body);
				}
			} else if (hasJSONContentType) {
				body = Utils.stringifySafely(body);
			}
		}
		
		if (['post', 'put', 'patch'].includes(type)) {
			headers = {
				'Content-Type': XContentType,
				...headers
			};
		}
	}

	leaf.request.url = url;
	leaf.request.body = body;
	leaf.request.headers = headers;

	return leaf;
};