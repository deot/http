# @deot/http

`@deot/http` 是 Browser 与 Node 的聚合入口，对外提供同一套 `createInstance` 和 `Network` API，并自动选择 [`@deot/http-client`](../client/README.md) 或 [`@deot/http-server`](../server/README.md)。

## 何时使用

- 同一份业务代码需要同时运行在 Browser 与 Node。
- 希望由打包器或运行环境自动选择官方 Adapter。
- 若目标是小程序或其他 JavaScript 宿主，请直接使用 [`@deot/http-core`](../core/README.md) 并接入该端 Provider。

## 安装

```bash
pnpm add @deot/http
```

## 基础用法

```ts
import { createInstance, Network } from '@deot/http';

await Network.http('https://example.com/api.json');
const CustomNetwork = createInstance({ timeout: 10_000 });
const leaf = CustomNetwork.http('/api/users');
await leaf.cancel();
```

## Browser 自动适配

浏览器加载聚合包时会进入 Client Adapter。下面通过真实 `data:` 请求展示自动选择结果。

:::playground
<!--
<config lang="json5">
{
	views: ['runtime', 'files'],
	viewport: 'auto',
	viewportOptions: ['auto', 375]
}
</config>
-->
```vue
<template>
	<main class="demo">
		<h2>@deot/http 自动适配</h2>
		<button @click="send">发送浏览器请求</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { Network } from '@deot/http';

const result = ref('');
const send = async () => {
	const data = encodeURIComponent(JSON.stringify({ runtime: 'browser', adapter: '@deot/http-client' }));
	const response = await Network.http(`data:application/json,${data}`, {
		responseType: 'json',
		credentials: 'omit'
	});
	result.value = JSON.stringify(response.body, null, 2);
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; overflow-wrap: anywhere; white-space: pre-wrap; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

## 环境选择

| 场景 | Adapter |
| --- | --- |
| 打包器识别 package `browser` export | Client |
| `process` 存在且 `window` 不存在 | Server |
| 其他浏览器环境 | Client |

聚合包不重新导出 Core 类型。需要 Core 类型或自定义多端 Provider 时，请显式安装 `@deot/http-core`。

## 聚合入口属性说明

`options`：`createInstance(options)` 不新增聚合包专用属性，而是把配置完整交给选中的 Client 或 Server Adapter。跨端代码应优先使用 Core 公共属性；平台专用属性应放在明确的运行端分支中。

```ts
const Network = createInstance({
	timeout: 5000,
	maxTries: 2,
	interval: 200
});
```

### Browser 条件

打包器命中 package 的 `browser` export 时直接加载 Client 构建；运行时入口则在存在 `window` 时选择 Client。此选择不是用户配置属性，不能通过 `createInstance` 强制切换。

### Node 条件

存在 `process` 且不存在 `window` 时选择 Server。SSR 工具若同时模拟 `window`，应显式导入 `@deot/http-server`，避免环境探测与预期不一致。

### 小程序等其他端

聚合包只内置 Browser 与 Node Adapter。微信等小程序应使用 `@deot/http-core` 并传入自定义 `provider`；业务层仍使用相同 `HTTPController` API。

## API

| API | 参数/类型 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `createInstance(options?)` | `HTTPRequestOptions`，默认 `{}` | `HTTPController` | 使用当前环境 Adapter 创建独立控制器。 |
| `Network` | `HTTPController` | — | 当前环境 Adapter 的默认共享实例。 |
| `Network.http(url, options?)` | URL、`HTTPRequest` 或配置对象；可选单次配置 | `HTTPShellLeaf` | 创建并立即发送，可直接 `await`。 |
| `Network.custom(url, options?)` | 同 `Network.http()` | `HTTPShell` | 创建可重复调用 `send()` 的 Shell，不立即发送。 |

浏览器自动适配示例展示了 `Network.http()` 的输入与输出。

完整公共参数见 [`@deot/http-core API`](../core/README.md#api)，浏览器扩展参数见 [`@deot/http-client API`](../client/README.md#api)，Node 扩展参数见 [`@deot/http-server API`](../server/README.md#api)。
