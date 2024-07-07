# @deot/http-core

可适配任何端的网络控制，具体的请求实现`provider`控制

在[Request/MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Request)基础上新增api

> 可全局注册或单词注册

- `provider`: 适配任何端的网络控制
- `localData`: 本地mock
- `timeout`: 超时控制
- `maxTries`: 最大尝试次数
- `interval`: maxTries > 1时，间隔时间
- `shared`: 共享请求（多个相同发起，等待同一个请求）
- `onStart`: 发起回调
- `onFinish`: 结束回调
- `onRequest`: 请求拦截
- `onReponse`: 响应拦截
- `[custom]`: 自行定义的api, 可以在`on*`的回调中做特殊处理

```ts
import { HTTPController, HTTPRequest, HTTPResponse } from '@deot/http-core';

const baseURL = 'https://xxx.com';
const apis = {
	A_GET: '/api.json'
};
const Network = new HTTPController({
	provider: (request: HTTPRequest) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(new HTTPResponse({ body: request.body }));
			}, 300);
		});
	},
	onRequest(leaf) {
		const request = new HTTPRequest(leaf.request);
		if (request.url && !/[a-zA-z]+:\/\/[^\s]*/.test(request.url)) {
			const [key, query] = request.url.split('?'); // 避免before带上?token=*之类
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

// cancel 1
const leaf = Network.http(`A_GET`);
await leaf.cancel();

// cancel 2
const shell = Network.custom(`A_GET`);
shell.send();

await shell.cancel();
```

- [HTTPRequestOptions](./src/request.ts)
- [HTTPRequest](./src/request.ts)
- [HTTPResponse](./src/response.ts)
- [HTTPHeaders](./src/headers.ts)
- [HTTPProvider](./src/provider.ts)

