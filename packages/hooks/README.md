# @deot/http-hooks

`@deot/http-hooks` 提供 Client 与 Server 共用的 `onRequest` 和 `onResponse`，负责动态 URL、查询参数、常见请求体编码及 JSON 响应解析。

## 何时使用

- 为自定义 Core Provider 补上与官方 Client/Server 一致的数据转换。
- 需要从 body 填充 RESTful 路径，并把剩余 GET 字段拼到查询参数。
- 需要统一处理 JSON、URL encoded、multipart、Form、FileList 等请求体。

## 安装

```bash
pnpm add @deot/http-hooks @deot/http-core
```

## 基础用法

```ts
import { HTTPController, HTTPResponse } from '@deot/http-core';
import { onRequest, onResponse } from '@deot/http-hooks';

const Network = new HTTPController({
	onRequest,
	onResponse,
	provider: async request => new HTTPResponse({
		body: JSON.stringify({ url: request.url, body: request.body })
	})
});
```

## 请求与响应转换

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
		<h2>Request / Response Hooks</h2>
		<button @click="send">转换请求</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';
import { onRequest, onResponse } from '@deot/http-hooks';

const result = ref('');
const Network = new HTTPController({
	onRequest,
	onResponse,
	provider: async request => new HTTPResponse({
		body: JSON.stringify({ url: request.url, body: request.body, parsedBy: '@deot/http-hooks' })
	})
});

const send = async () => {
	const response = await Network.http('/users/:id', {
		dynamic: true,
		body: { id: 42, active: true, page: 1 }
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

运行后 URL 为 `/users/42?active=true&page=1`，Provider 返回的 JSON 字符串会转换为对象。

## 转换规则

`onRequest` 先处理动态路径，再按方法和 Content-Type 转换 body。`onResponse` 仅尝试解析字符串，解析失败时保持原值。

## Hook 属性示例与说明

`dynamic`：设为 `true` 后，`url` 中的 `/:key`、`/{key}` 会读取 body 同名字段；支持 `book.id` 这类嵌套路径。使用过的字段会从原对象删除。

`Content-Type`：显式的 `application/json`、`application/x-www-form-urlencoded`、`multipart/form-data` 决定普通对象的转换方式。FormData 最终会删除该请求头，让运行时生成带 boundary 的值。

`HTTPHeaders` 当前按 key 精确匹配，Hook 读取的是 `Content-Type`。传入小写 `content-type` 不会被视为同一个字段；项目请求 Hook 和普通配置应统一使用 `Content-Type`。

`method`：GET 普通对象转换为查询参数并清空 body。POST、PUT、PATCH 在没有明确 Content-Type 且最终 body 不是 FormData 时，会补充 URL encoded Content-Type。

`body`：body 同时承担动态路径参数源与待发送数据。若不希望 Hook 删除业务对象中的动态字段，应在传入前创建副本。

```ts
const body = { id: 42, filter: 'active' };
await Network.http('/users/:id', {
	dynamic: true,
	body: { ...body }
});
```

`leaf.response.body`：`onResponse` 只处理字符串。合法 JSON 会被替换为解析结果；解析失败或非字符串值保持不变，不会抛出解析异常。

## API

| API | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `onRequest(leaf)` | `HTTPShellLeaf` | `HTTPShellLeaf` | 转换动态 URL、headers 和 body。 |
| `onResponse(leaf)` | `HTTPShellLeaf` | `HTTPShellLeaf` | 尝试解析字符串响应。 |

#### `onRequest(leaf)`

转换 URL、headers 和 body，返回当前 `HTTPShellLeaf`。本页请求与响应转换示例展示了动态路径、GET query 和响应解析的完整输入输出。

##### 参数

Hook 读取并修改 `leaf.request` 的以下字段：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | — | 支持 `/:key`、`/{key}` 和嵌套路径 key。 |
| `method` | `string` | `'GET'` | 不区分大小写；GET 普通对象会转查询参数。 |
| `body` | `any` | `null` | 动态字段来源及待编码请求体。 |
| `headers` | `HTTPHeaders` | `{}` | 读取或补充 `Content-Type`。 |
| `dynamic` | `boolean` | `false` | 是否替换动态路径并删除已使用的 body 字段。 |

##### body 转换

| 输入/条件 | 输出 | Content-Type 行为 |
| --- | --- | --- |
| GET + 普通对象 | URL query，body 置 `null` | 不主动设置。 |
| 普通对象或数组 | `JSON.stringify(body)` | 未指定时设 `application/json`。 |
| `application/x-www-form-urlencoded` + 对象或数组 | `key=value&...` | 保留指定值。 |
| `multipart/form-data` + 对象或数组 | `FormData` | 最终删除头，让运行时生成 boundary。 |
| `HTMLFormElement` | `FormData` | 同上。 |
| `FileList` | `FormData`，字段名 `files[]` | 同上。 |
| `URLSearchParams` | `.toString()` | 未指定时设 URL encoded。 |
| `ArrayBufferView` | 底层 `ArrayBuffer` | 不主动设置。 |
| `ArrayBuffer`、Buffer、Stream、File、Blob、FormData、string、空值 | 保持原值 | FormData 删除 Content-Type；POST/PUT/PATCH 其他值未指定时设 URL encoded。 |

URL encoded 与 multipart 对象会跳过 `null`、`undefined`，保留 `false`、`0` 和空字符串；嵌套普通对象会序列化为 JSON 字符串。FormData 与 `application/json` 同时出现会抛错。

URL encoded 转换会对 value 执行 `encodeURIComponent`，不会编码字段名；字段名包含空格、`&`、`=` 等字符时，应在进入 Hook 前自行规范化。

##### 动态 URL 参数

```ts
await Network.http('/repo/{book.id}/:articleId?page={page}', {
	dynamic: true,
	body: {
		book: { id: 10 },
		articleId: 20,
		page: 2,
		keyword: 'http'
	}
});
```

动态替换仅在 body 为普通对象时执行，值会原样插入 URL，不会自动执行 URL 编码。已替换字段会从原 body 删除；缺少或为假值的动态路径字段连同其 `/` 前缀一起删除。嵌套字段删除后留下的空父对象仍属于剩余字段，之后 GET 会把它和其他剩余字段一起加入查询参数。

#### `onResponse(leaf)`

尝试把字符串响应解析为 JSON，解析失败或输入不是字符串时保持原值，并返回当前 `HTTPShellLeaf`。

##### 参数与返回值

| 输入 | 输出 |
| --- | --- |
| 可被 `JSON.parse` 解析的字符串 | 对象、数组、数字、布尔值或 `null`。 |
| 其他字符串 | 原字符串。 |
| Blob、Buffer、Stream、对象及其他非字符串 | 原值。 |

两个 Hook 的返回值均为当前 `HTTPShellLeaf`，供 Core 保留原地修改后的请求或响应。
