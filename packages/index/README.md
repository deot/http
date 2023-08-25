# @deot/http

自动选择`Browser`和`Node`环境

```ts
import { createInstance, Network } from '@deot/http';

await Network.http(`https://xxx.com/api.json`);
await Network.http({
	url: `https://xxx.com/api.json`
});

// cancel 1
const leaf = Network.http(`https://xxx.com/api.json`);
await leaf.cancel();

// cancel 2
const shell = Network.custom(`https://xxx.com/api.json`);
shell.send();

await shell.cancel();
```

所有`api`与[`@deot/http-core`](../core)一致，可忽略`provider`实现细节
