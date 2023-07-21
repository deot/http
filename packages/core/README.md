# @deot/http-core

可适配任何端的网络控制，具体的请求实现`provider`控制

```ts
import { HttpController, HttpRequest, HttpResponse } from '@deot/http-core';

const Network = new HttpController({
	apis: {
		A_GET: 'https://xxx.com/api.json'
	},
	provider: (request: HttpRequest) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(new HttpResponse({ body: request.body }));
			}, 300);
		});
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

