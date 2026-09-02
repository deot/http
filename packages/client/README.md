# @deot/http-client

`@deot/http-client` 是浏览器适配包，使用 Fetch、XHR 或 JSONP 发送请求，并复用 [`@deot/http-core`](../core/README.md) 的控制器和 [`@deot/http-hooks`](../hooks/README.md) 的数据转换。

## 何时使用

- 只需要浏览器构建，不需要 Node 自动适配。
- 需要在 Fetch 与 XHR 之间切换，或需要上传、下载进度。
- 需要用统一的 `http`、`custom`、取消、重试和钩子 API 管理浏览器请求。

## 安装

```bash
pnpm add @deot/http-client
```

## 基础用法

```ts
import { createInstance, Network } from '@deot/http-client';

const response = await Network.http('/api/users');
const AuthorizedNetwork = createInstance({
	timeout: 10_000,
	onRequest(leaf) {
		leaf.request.headers.set('Authorization', 'Bearer token');
		return leaf;
	}
});

await AuthorizedNetwork.http('/api/users', {
	method: 'POST',
	body: { name: 'deot' }
});
```

## Fetch Provider 与 `responseType`

下面使用 `data:` URL 完成真实 Fetch，不依赖第三方服务。

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
		<h2>Browser Provider</h2>
		<label>姓名 <input v-model="name" /></label>
		<button :disabled="pending" @click="send">{{ pending ? '请求中…' : '发送 Fetch 请求' }}</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { createInstance } from '@deot/http-client';

const name = ref('deot');
const pending = ref(false);
const result = ref('');
const Network = createInstance({ timeout: 3000 });

const send = async () => {
	pending.value = true;
	const payload = encodeURIComponent(JSON.stringify({ name: name.value, provider: 'fetch' }));
	const response = await Network.http(`data:application/json,${payload}`, {
		responseType: 'json',
		credentials: 'omit'
	});
	result.value = JSON.stringify({ status: response.status, body: response.body }, null, 2);
	pending.value = false;
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
.demo label { display: grid; gap: 6px; }
input, button { padding: 6px 10px; }
input { width: 100%; max-width: 480px; box-sizing: border-box; }
button { width: fit-content; cursor: pointer; }
pre { margin: 0; padding: 12px; overflow-wrap: anywhere; white-space: pre-wrap; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

## Provider 选择

| 条件 | Provider | 适用能力 |
| --- | --- | --- |
| 默认且存在 `window.fetch` | Fetch | 标准浏览器请求、`AbortController` 取消。 |
| `useXHR: true` 或不存在 Fetch | XHR | 上传/下载进度、同步开关及旧浏览器。 |
| `jsonp: 'callbackName'` | JSONP | 服务端返回指定全局回调的跨域读取。 |

## 取消请求

```ts
const leaf = Network.http('/api/users');
await leaf.cancel();

const shell = Network.custom('/api/users');
const current = shell.send();
await current.cancel();
```

## 注意事项

- JSONP 回调名必须是未被 `window` 占用的字符串。
- 请求体编码、动态 URL 和 JSON 字符串解析由默认 Hooks 完成，规则见 [`@deot/http-hooks`](../hooks/README.md)。
- 完整生命周期、重试和共享请求参数见 [`@deot/http-core`](../core/README.md#api)。

## 浏览器属性示例与说明

`useXHR`：设为 `true` 会跳过 Fetch 检测并强制使用 XHR。需要上传或下载进度时必须开启。

```ts
Network.http('/upload', {
	useXHR: true,
	method: 'POST',
	body: file
});
```

`jsonp`：值是服务端响应要调用的全局函数名。该名称已存在于 `window` 或不是字符串时，会返回 `HTTP_CODE_ILLEGAL`。当前 JSONP Provider 不会自动删除插入的 script 或全局回调，也没有单独处理 script 加载错误；只应在回调名称和响应页面均可控的场景使用。

```ts
Network.http('/jsonp?callback=receiveUsers', {
	jsonp: 'receiveUsers'
});
```

`responseType`：Fetch 模式会调用 `Response[responseType]()`；XHR 模式会写入 `xhr.responseType`。因此 Fetch 的 ArrayBuffer 名称是区分大小写的 `'arrayBuffer'`，XHR 对应值是小写 `'arraybuffer'`。

Fetch 找不到对应读取方法时会把原生 `Response` 作为 body 返回，而不是抛出解析错误。应使用表中列出的标准名称，不要依赖这个回退行为。

```ts
Network.http('/avatar', { responseType: 'blob' });
```

`onDownloadProgress`：仅 XHR 生效，接收下载阶段的 `ProgressEvent`。可以用 `event.lengthComputable` 判断是否能计算百分比。

`onUploadProgress`：仅 XHR 生效，监听目标为 `xhr.upload`，适合展示文件上传进度。

```ts
Network.http('/upload', {
	useXHR: true,
	method: 'POST',
	body: formData,
	onUploadProgress: (event) => {
		if (event.lengthComputable) progress.value = event.loaded / event.total;
	}
});
```

`async`：仅 XHR 生效，默认 `true`，直接作为 `xhr.open(method, url, async)` 的第三个参数。同步 XHR 会阻塞主线程，不建议在页面业务中使用。

`credentials`：Fetch 原样接收 `'omit'`、`'same-origin'`、`'include'`。XHR 中 `'omit'` 映射为 `withCredentials = false`，其他真值映射为 `true`，并非 Fetch 语义的完全等价实现。

`timeout`：Core 对所有 Provider 都有统一超时竞速；Fetch 另外使用 AbortController 和计时器，XHR 另外使用原生 `xhr.timeout`。JSONP 只有 Core 的逻辑超时，超时后不会移除 script 或全局回调。三种路径最终都以 `HTTP_REQUEST_TIMEOUT` 结束当前 Leaf。

## API

| API | 参数/类型 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `createInstance(options?)` | `HTTPRequestOptions`，默认 `{}` | `HTTPController` | 创建带浏览器 Provider 和默认 Hooks 的独立控制器。 |
| `Network` | `HTTPController` | — | `createInstance({})` 创建的默认共享实例。 |

各实例的公共配置和 Shell 列表互不共享。应用只有一套公共请求配置时可直接使用 `Network`；需要隔离认证或生命周期时使用 `createInstance()`。前面的 Fetch 示例同时展示了输入配置和响应输出。

控制器提供 `http`、`custom`、`cancel`、`removeShared` 和 `clear`；单次请求返回的 `HTTPShellLeaf` 可直接 `await`。Fetch 与 XHR 分别把底层 Fetch Promise、`XMLHttpRequest` 写入 `leaf.server`；JSONP 当前不写入该属性，也不会通过 `leaf.cancel()` 移除已插入的 script。

未设置 `enforce` 时，`createInstance` 会把 Controller 级自定义 `onRequest` 放在通用请求转换 Hook 之前，把通用响应解析 Hook 放在 Controller 级自定义 `onResponse` 之前。Core 还会把单次请求 Hook 合并到 Controller Hook 之前；需要跨层固定先后关系时使用 `enforce: 'pre' | 'post'`。

### 浏览器请求参数

除 Core 的 `HTTPRequestOptions` 外，浏览器 Provider 识别以下参数：

| 参数 | 类型 | 默认值 | Provider | 说明 |
| --- | --- | --- | --- | --- |
| `useXHR` | `boolean` | `false` | 选择器 | 强制使用 XHR。 |
| `jsonp` | `string` | — | JSONP | 全局回调函数名；存在时优先于 Fetch/XHR。 |
| `responseType` | `string` | `'text'` | Fetch/XHR | Fetch 常用值为 `'text'`、`'json'`、`'blob'`、`'arrayBuffer'`、`'formData'`；XHR 使用 `XMLHttpRequestResponseType`。 |
| `onDownloadProgress` | `(event: ProgressEvent) => void` | — | XHR | 下载进度回调。 |
| `onUploadProgress` | `(event: ProgressEvent) => void` | — | XHR | 上传进度回调。 |
| `async` | `boolean` | `true` | XHR | 传给 `xhr.open` 的异步开关。 |
| `credentials` | `RequestCredentials` | `'same-origin'` | Fetch/XHR | Fetch 原样使用；XHR 中 `'omit'` 转为 `withCredentials = false`，其他真值转为 `true`。 |
| `timeout` | `number` | `60000` | Fetch/XHR | 毫秒；Fetch 使用计时器和 AbortController，XHR 写入 `xhr.timeout`。 |

### Leaf 属性

| 属性 | Fetch | XHR | JSONP | 说明 |
| --- | --- | --- | --- | --- |
| `leaf.server` | Fetch Promise | `XMLHttpRequest` | 未设置 | 保存底层句柄，主要用于诊断和高级集成。 |

其余可枚举请求字段会继续传给 Fetch `RequestInit`；XHR 使用 `method`、`url`、`headers` 和 `body`。成功状态范围为 200–299，其他状态返回 `HTTPResponse.error()`。Fetch 的非 2xx 错误 body 是原生 `Response`，XHR 的非 2xx 路径不会读取响应 body。

Fetch/XHR Provider 当前只从原生响应映射 `status`、`headers` 和 `body`；`url`、`statusText`、`redirected`、`type`、`ok` 等字段沿用 Core 默认值，不能当作原生响应元数据读取。
