# @deot/http-core

可适配任何端的网络控制，具体的请求实现`provider`控制

```ts
import { HttpController, HttpRequest, HttpResponse } from '@deot/http-core';

const baseURL = 'https://xxx.com';
const apis = {
	A_GET: '/api.json'
};
const Network = new HttpController({
	provider: (request: HttpRequest) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(new HttpResponse({ body: request.body }));
			}, 300);
		});
	},
	onRequest(leaf) {
		const request = new HTTPRequest(leaf.request);
		if (request.url && !/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
			let [key, query] = request.url.split('?'); // 避免before带上?token=*之类
			request.url = `${apis[key] ? `${baseURL}${apis[key]}` : ''}${query ? `?${query}` : ''}`;
		}
		return request;
	}
});

await Network.http(`A_GET`);
await Network.http(`https://xxx.com/api.json`);
await Network.http({
	url: `https://xxx.com/api.json`
});

await Network.http({
	url: `A_GET`,
	body: {}
});
```

- [HttpRequestOptions](./src/request.ts)
- [HttpRequest](./src/request.ts)
- [HttpResponse](./src/response.ts)
- [HttpProvider](./src/provider.ts)

