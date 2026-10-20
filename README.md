[ci-image]: https://github.com/deot/http/actions/workflows/ci.yml/badge.svg?branch=main
[ci-url]: https://github.com/deot/http/actions/workflows/ci.yml

[![build status][ci-image]][ci-url]

# @deot/http

一套请求 API，连接不同运行端。

`@deot/http` 用 Core 统一管理发送、取消、超时、重试和共享，用 Provider 连接平台网络能力，用 Hook 接入数据转换和业务策略。浏览器与 Node 可以直接使用内置适配；小程序等端封装自己的 Provider 后，沿用同一套请求控制 API。

## 特性

- **多端适配**：Browser / Node 自动选择内置 Adapter，也支持单端按需安装。
- **Provider 扩展**：通过 Core 接入小程序等运行端，沿用同一套请求控制 API。
- **生命周期 Hook**：组合异步钩子，统一数据转换与业务策略。
- **取消与超时**：通过 Leaf 取消执行，通过 `timeout` 限制等待时间。
- **失败重试**：通过 `maxTries` 与 `interval` 配置尝试次数和重试间隔。
- **共享与复用**：`custom().send()` 重复发送，`shared` 复用匹配请求。

## 概念分层

| 层级 | 职责 | 本仓库实现 |
| --- | --- | --- |
| Core | 标准化请求/响应，管理生命周期、取消、重试和共享 | `@deot/http-core` |
| Hook | 在传输前后转换数据或实现业务策略 | `@deot/http-hooks` 及项目自定义 Hook |
| Provider | 把一个运行端的传输能力包装为 `Promise<HTTPResponse>` | Fetch、XHR、JSONP、Node 或自定义小程序实现 |
| Adapter | 组合 Core、默认 Hook 与 Provider，并暴露 `createInstance` / `Network` | `@deot/http-client`、`@deot/http-server` |
| 聚合入口 | 在 Browser 与 Node Adapter 之间选择 | `@deot/http` |

Core 决定“请求如何被控制”，Provider 决定“请求如何被发送”，Adapter 决定“某个运行端默认组合哪些能力”。小程序等端复用 Core API，但需要提供自己的 Provider 或 Adapter。

鉴权 Token、`baseUrl`、Loading 和消息提示属于项目策略，由 Hook 或 Provider 实现，具体示例见下方“项目级网络层”。

## Monorepo

[npm-shared-image]: https://img.shields.io/npm/v/@deot/http-shared.svg
[npm-shared-url]: https://www.npmjs.com/package/@deot/http-shared

[npm-core-image]: https://img.shields.io/npm/v/@deot/http-core.svg
[npm-core-url]: https://www.npmjs.com/package/@deot/http-core

[npm-client-image]: https://img.shields.io/npm/v/@deot/http-client.svg
[npm-client-url]: https://www.npmjs.com/package/@deot/http-client

[npm-hooks-image]: https://img.shields.io/npm/v/@deot/http-hooks.svg
[npm-hooks-url]: https://www.npmjs.com/package/@deot/http-hooks

[npm-server-image]: https://img.shields.io/npm/v/@deot/http-server.svg
[npm-server-url]: https://www.npmjs.com/package/@deot/http-server

[npm-image]: https://img.shields.io/npm/v/@deot/http.svg
[npm-url]: https://www.npmjs.com/package/@deot/http

| 包名                        | 版本                                         | 说明                                                |
| ------------------------- | ------------------------------------------ | ------------------------------------------------- |
| [core](packages/core)     | [![npm][npm-core-image]][npm-core-url]     | 请求控制中心，通过 Provider 适配任意 JavaScript 运行环境           |
| [client](packages/client) | [![npm][npm-client-image]][npm-client-url] | 浏览器端 Provider，支持 Fetch、XHR 和 JSONP                  |
| [server](packages/server) | [![npm][npm-server-image]][npm-server-url] | Node Provider，支持重定向、流和响应体大小限制                    |
| [hooks](packages/hooks)   | [![npm][npm-hooks-image]][npm-hooks-url]   | 通用请求与响应转换钩子                                      |
| [shared](packages/shared) | [![npm][npm-shared-image]][npm-shared-url] | 公共 TypeScript 类型与共享命名空间                           |
| [index](packages/index)   | [![npm][npm-image]][npm-url]               | 聚合入口，自动匹配 `@deot/http-client` 或 `@deot/http-server` |

## 安装

推荐安装自动适配运行环境的聚合包：

```bash
pnpm add @deot/http
```

也可以按运行环境安装：

```bash
pnpm add @deot/http-client # Browser
pnpm add @deot/http-server # Node
pnpm add @deot/http-core   # 自定义 Provider
```

## 快速开始

```ts
import { createInstance } from '@deot/http';

const Network = createInstance({
	timeout: 10_000,
	onRequest(leaf) {
		leaf.request.headers.set('X-Client', 'deot-http');
		return leaf;
	}
});

export const loadUser = async () => {
	const response = await Network.http<{ id: number; name: string }>('https://api.example.com/users/1');
	return { status: response.status, user: response.body };
};
```

示例 URL 需要替换为真实接口。浏览器可使用相对 URL；Node 应提供完整的 HTTP/HTTPS URL。官方 Adapter 的通用 Hooks 会把 GET 普通对象 body 转为查询参数，并尝试解析字符串 JSON 响应。

### HTTPController

`createInstance()` 返回独立的 `HTTPController`；包导出的 `Network` 是默认共享实例。Controller、Shell 与 Leaf 分别管理公共配置、可复用请求定义和单次执行。

| API | 返回值 | 用途 |
| --- | --- | --- |
| `http(url, options?)` | `HTTPShellLeaf<T>` | 创建并立即发送，可直接 `await`。 |
| `custom(url, options?)` | `HTTPShell<T>` | 保存请求定义，调用 `send()` 才发送。 |
| `cancel(id?)` | `Promise<void>` | 按 id / Leaf 取消，省略参数则取消当前管理的请求。 |
| `removeShared(key?)` | `Promise<void>` | 移除指定或全部共享请求。 |
| `clear()` | `Promise<void>` | 取消请求并移除共享结果。 |

`Network.http()` 会立即发送请求，并返回兼容 Promise 的 `HTTPShellLeaf`：

```ts
const leaf = Network.http('/api/users');

// 取消当前请求
await leaf.cancel();
```

需要复用同一个请求配置时，先通过 `custom()` 创建 Shell：

```ts
const shell = Network.custom('/api/users', {
	method: 'GET'
});

const first = await shell.send();
const second = await shell.send();
```

## 接入自定义 Provider

Core 本身不绑定网络实现。Provider 接收标准化 `HTTPRequest` 和当前 Leaf，返回 `Promise<HTTPResponse>`。下面用本地响应展示约定，可把传输部分替换为 `uni.request`、`wx.request` 或其他平台 API：

```ts
import { HTTPController, HTTPResponse } from '@deot/http-core';

const Network = new HTTPController({
	onRequest(leaf) {
		leaf.request.headers.set('X-Source', 'docs');
	},
	provider: async request => new HTTPResponse({
		body: { url: request.url, method: request.method }
	})
});

const response = await Network.http('/users');
const data = response.body; // { url: '/users', method: 'GET' }
```

真实 Provider 应将传输失败转换为 `HTTPResponse.error()`；要取消底层任务，需包装 Core 已提供的 `leaf.cancel` 并调用平台 `abort()`。直接使用 Core 时，请求编码和 JSON 解析应自行接入 `@deot/http-hooks`。完整平台映射见 [Core 文档](packages/core/README.md#多端-provider)。

## `Network.http()` 请求示例

下面的示例在浏览器内运行，并使用 `localData` 返回本地数据，不会访问第三方接口。

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
		<h2>@deot/http</h2>
		<p>使用同一套 API 发送请求并读取标准化响应。</p>
		<button :disabled="pending" @click="request">
			{{ pending ? '请求中…' : '发送本地请求' }}
		</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { Network } from '@deot/http';

const pending = ref(false);
const result = ref('');

const request = async () => {
	pending.value = true;
	const response = await Network.http('/playground', {
		localData: {
			message: 'Hello @deot/http',
			runtime: 'browser'
		}
	});
	result.value = JSON.stringify({
		status: response.status,
		body: response.body
	}, null, 2);
	pending.value = false;
};
</script>

<style>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; overflow-wrap: anywhere; white-space: pre-wrap; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

## 常用配置

`HTTPRequestOptions` 在标准 Request 选项上增加以下能力：

| 配置 | 说明 |
| --- | --- |
| `provider` | 实际发送请求的 Provider。 |
| `localData` | 真值时跳过 Provider，并跳过 `onStart` / `onFinish`；仍执行请求与响应 Hook。 |
| `timeout` | Core 超时等待时间，默认 60 秒；`0` 关闭。 |
| `maxTries` | 包含首次请求在内的最大尝试次数，默认 1。 |
| `interval` | 重试之间的等待时间。 |
| `shared` | 真值 key 与请求 JSON 序列化结果相同时复用同一 Leaf；成功结果保留到 `removeShared` / `clear`。 |
| `onStart` / `onFinish` | Shell 开始与完成时调用，一组并发 `send()` 各执行一次；重试不重复触发。 |
| `onRequest` / `onResponse` | Provider 前后调用，可改写请求或响应。 |

完整选项和生命周期行为见 [`@deot/http-core`](packages/core/README.md)。

普通传输路径为 `onStart → onRequest → Provider → onResponse → onFinish`。Hook 可以返回 Promise，Core 会依次等待；同一阶段按 `pre` / 默认 / `post` 排序。`onRequest` 可重建请求，`onResponse` 可重建响应。

`maxTries` 包含首次执行，`interval` 只在下一次重试前等待；业务失败需要转换为错误响应才会触发重试。共享请求会保留成功的 Leaf，应按业务数据的有效期主动调用 `removeShared()`，并保存 `await leaf` 得到的响应；普通 Leaf 完成后会被清理。

## 项目级网络层

实际业务通常先基于 `createInstance()` 或 `HTTPController` 创建一个全局 Network，再由 Hook 集中完成以下工作：

- 为相对 URL 补充运行时 `baseUrl`，写入 Token、租户或来源 Header。
- 用 `loading`、`confirmTip`、`errorTip`、`successTip` 等应用自定义属性控制 UI。
- 把 HTTP 200 中的业务失败码转换为 `type: 'error'`，统一进入重试与 reject 流程。
- 在小程序 Provider 中映射平台 header、响应结构和底层 `abort()`。
- 在项目服务层自行封装 `get`、`post`、`upload`、`download`，业务代码仍以 `HTTPResponse` 为统一返回值。

这些名称不是库的内置配置；Core 通过 `[key: string]: any` 保存它们，具体行为由项目 Hook 或 Provider 实现。完整模式与边界见 [`Core：真实项目中的 Network 封装`](packages/core/README.md#真实项目中的-network-封装)。

## 运行环境

| 场景 | 推荐包 | Provider |
| --- | --- | --- |
| Browser / Node 同构代码 | `@deot/http` | 根据 browser export 和运行环境自动选择 |
| 浏览器应用 | `@deot/http-client` | 优先 Fetch，可切换 XHR 或 JSONP |
| Node 服务 | `@deot/http-server` | `node:http`、`node:https` 与 `follow-redirects` |
| 小程序及其他 JavaScript 端 | `@deot/http-core` | 封装 `uni.request`、`wx.request` 或目标端传输能力，实现 `HTTPProvider` |

## 文档站

仓库根目录的 `index.html` 聚合主 README 和各子包 README：

```bash
npm run docs:dev
```

开发模式读取本地文件；直接部署时读取 GitHub `main` 分支内容。文档中的可运行示例通过公共 CDN 加载依赖，需要网络连接。

## Contributing

这是一个使用 [pnpm](https://pnpm.io/) 管理的 [monorepo](https://en.wikipedia.org/wiki/Monorepo) 仓库。

```bash
# 安装与关联子包
npm run init
npm run link

# 开发与构建
npm run dev -- --package-name '*'
npm run build -- --package-name '*'

# 质量检查
npm run lint
npm run typecheck
npm run test -- --package-name '*'

# 发布并生成 ChangeLog（默认 dry run）
npm run release
```

`release` 支持 `--no-dry-run`、`--no-tag`、`--no-publish`、`--no-commit`、`--no-push`、`--force-update-package`、`--skip-update-package`、`--custom-version` 以及 `--patch` / `--minor` / `--major`。

ChangeLog 收录 `break change`、`feat`、`fix`、`style`、`perf`、`types`、`refactor`、`chore` 等提交类型；无作用域的提交或使用 `[package]` 标记的提交会跳过收集。

贡献代码前请阅读 [贡献指南](.github/CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
