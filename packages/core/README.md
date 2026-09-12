# @deot/http-core

`@deot/http-core` 是与运行环境无关的请求控制中心。它负责配置、生命周期、取消、超时、重试和共享；请求如何发送由 `HTTPProvider` 决定。

## 何时使用

- 为 Browser、Node、微信/其他小程序或自定义 JavaScript 宿主提供同一套请求 API。
- 希望把传输层与取消、重试、共享和业务钩子解耦。
- 需要实现新的 Adapter，或只使用不依赖平台网络模块的请求控制能力。

## 安装

```bash
pnpm add @deot/http-core
```

## 基础用法

```ts
import { HTTPController, HTTPResponse } from '@deot/http-core';

const Network = new HTTPController({
	provider: async request => new HTTPResponse({
		status: 200,
		body: { url: request.url, body: request.body }
	})
});

const response = await Network.http('/users', {
	method: 'POST',
	body: { name: 'deot' }
});
```

## 多端 Provider

| 运行环境 | 可封装的底层能力 | 业务层 API |
| --- | --- | --- |
| Browser | Fetch、XHR、JSONP | `HTTPController` / `http` / `custom` |
| Node | `node:http`、`node:https` | 同上 |
| 小程序 | `uni.request`、`wx.request` 或对应平台 API | 同上 |
| 其他 JavaScript 宿主 | 任意可封装为 Promise 的传输能力 | 同上 |

Provider 接收标准化后的 `HTTPRequest` 和当前 `HTTPShellLeaf`，返回 `Promise<HTTPResponse>`。需要底层取消时，可在 Provider 中包装 `leaf.cancel`：

```ts
const provider = (request, leaf) => new Promise((resolve, reject) => {
	const task = uni.request({
		url: request.url,
		method: request.method,
		data: request.body ?? undefined,
		header: request.headers.toJSON(),
		timeout: request.timeout,
		success: (result) => {
			const options = {
				status: result.statusCode,
				headers: result.header,
				body: result.data,
				originalData: result.originalData
			};
			if (result.statusCode >= 200 && result.statusCode < 300) {
				resolve(new HTTPResponse(options));
			} else {
				reject(HTTPResponse.error(
					result.data?.msg || 'HTTP_STATUS_ERROR',
					options
				));
			}
		},
		fail: error => reject(HTTPResponse.error(
			error.errMsg || error.errorMessage || 'HTTP_STATUS_ERROR',
			{ body: error }
		))
	});
	leaf.server = task;
	const cancel = leaf.cancel;
	leaf.cancel = async () => {
		task.abort?.();
		await cancel();
	};
});
```

小程序平台通常使用 `header`，Core 使用 `headers: HTTPHeaders`，接入时需要显式转换。Provider 应把 2xx 解析为普通 `HTTPResponse`，把非 2xx 和平台失败回调转换为 `HTTPResponse.error()`；保存 `leaf.server` 并包装已有 `leaf.cancel` 后，业务层才能沿用同一套诊断与取消方式。`uni.uploadFile`、`uni.downloadFile` 等特殊任务可以按自定义 `transport` 属性在 Provider 内分流。

## `HTTPController` 与 Provider 生命周期

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
		<h2>自定义 Provider</h2>
		<button :disabled="pending" @click="send">{{ pending ? '发送中…' : '发送请求' }}</button>
		<p>生命周期：{{ events.join(' → ') || '尚未发送' }}</p>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const pending = ref(false);
const events = ref([]);
const result = ref('');
const Network = new HTTPController({
	provider: request => new Promise((resolve) => {
		setTimeout(() => resolve(new HTTPResponse({ status: 201, body: { echo: request.body } })), 250);
	}),
	onStart: () => events.value.push('onStart'),
	onRequest: {
		enforce: 'pre',
		handler: (leaf) => {
			events.value.push('onRequest');
			leaf.request.headers.set('X-Demo', 'true');
			return leaf;
		}
	},
	onResponse: (leaf) => {
		events.value.push('onResponse');
		return { body: { ...leaf.response.body, transformed: true } };
	},
	onFinish: () => events.value.push('onFinish')
});

const send = async () => {
	events.value = [];
	pending.value = true;
	const response = await Network.http('/echo', { method: 'POST', body: { name: 'deot' } });
	result.value = JSON.stringify({ status: response.status, body: response.body }, null, 2);
	pending.value = false;
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; overflow-wrap: anywhere; white-space: pre-wrap; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

## 生命周期与共享

执行顺序为 `onStart → onRequest → provider → onResponse → onFinish`。同一阶段的 Hook 按 `pre → 默认 → post` 排序；请求级 Hook 在 Controller 公共 Hook 之前合并。同步与异步 Hook 都会被依次等待。`shared` 相同且请求序列化结果相同的调用会复用同一个 Leaf，直到主动清理。

#### `onStart` 执行时机

`onStart` 在一个 Shell 进入请求中状态时执行。下面同时发送两个 Leaf，Provider 会执行两次，但 `onStart` 只执行一次。

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
		<h2>onStart</h2>
		<button :disabled="pending" @click="run">并发发送两个 Leaf</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const pending = ref(false);
const result = ref('');
let starts = 0;
let requests = 0;
const Network = new HTTPController({
	onStart: () => starts++,
	provider: () => new Promise((resolve) => {
		requests++;
		setTimeout(() => resolve(new HTTPResponse({ body: requests })), 180);
	})
});
const shell = Network.custom('/batch');

const run = async () => {
	pending.value = true;
	starts = 0;
	requests = 0;
	await Promise.all([shell.send(), shell.send()]);
	result.value = JSON.stringify({ starts, requests }, null, 2);
	pending.value = false;
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

#### `onFinish` 执行时机

`onFinish` 在同一 Shell 的最后一个 Leaf 完成时执行。下面两个响应都完成后，完成 Hook 只记录一次。

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
		<h2>onFinish</h2>
		<button :disabled="pending" @click="run">等待整个 Shell 完成</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const pending = ref(false);
const result = ref('');
let finishes = 0;
let completed = 0;
const Network = new HTTPController({
	onFinish: () => finishes++,
	provider: () => new Promise((resolve) => {
		setTimeout(() => {
			completed++;
			resolve(new HTTPResponse({ body: completed }));
		}, 180);
	})
});
const shell = Network.custom('/batch');

const run = async () => {
	pending.value = true;
	finishes = 0;
	completed = 0;
	await Promise.all([shell.send(), shell.send()]);
	result.value = JSON.stringify({ completed, finishes }, null, 2);
	pending.value = false;
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

#### `onRequest` 执行时机

`onRequest` 在 Provider 前执行。它可以原地修改 `leaf.request`，也可以返回请求配置对象重建实际请求。

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
		<h2>onRequest</h2>
		<button @click="run">改写请求</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const result = ref('');
const Network = new HTTPController({
	onRequest: leaf => ({
		url: `${leaf.request.url}?from=onRequest`,
		method: 'POST',
		headers: { 'X-Hook': 'onRequest' },
		body: { ...leaf.request.body, transformed: true }
	}),
	provider: async request => new HTTPResponse({
		body: {
			url: request.url,
			method: request.method,
			headers: request.headers.toJSON(),
			body: request.body
		}
	})
});

const run = async () => {
	const response = await Network.http('/users', {
		body: { name: 'deot' }
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

#### `onResponse` 执行时机

`onResponse` 在 Provider 后执行。`originalResponse` 保留 Provider 原始值，返回配置对象可以重建最终响应。

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
		<h2>onResponse</h2>
		<button @click="run">改写响应</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const result = ref('');
let originalStatus;
const Network = new HTTPController({
	provider: async () => new HTTPResponse({
		status: 201,
		body: { source: 'provider' }
	}),
	onResponse: (leaf) => {
		originalStatus = leaf.originalResponse.status;
		return {
			status: 202,
			body: { ...leaf.response.body, transformed: true }
		};
	}
});

const run = async () => {
	const response = await Network.http('/users');
	result.value = JSON.stringify({
		originalStatus,
		status: response.status,
		body: response.body
	}, null, 2);
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

#### `enforce` 排序

`enforce` 只调整同一阶段 Hook 的顺序。请求级 Hook 先与 Controller Hook 合并，再稳定排序为 `pre → null/默认 → post`。

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
		<h2>enforce 顺序</h2>
		<button @click="run">执行 Hook 链</button>
		<pre v-if="result">{{ result }}</pre>
	</main>
</template>

<script setup>
import { ref } from 'vue';
import { HTTPController, HTTPResponse } from '@deot/http-core';

const result = ref('');
const events = [];
const hook = (label, enforce = null) => ({
	enforce,
	handler: (leaf) => {
		events.push(label);
		return leaf;
	}
});
const Network = new HTTPController({
	onRequest: [
		hook('controller-pre', 'pre'),
		hook('controller-default'),
		hook('controller-post', 'post')
	],
	provider: async () => new HTTPResponse({ body: [...events] })
});

const run = async () => {
	events.length = 0;
	const response = await Network.http('/order', {
		onRequest: [
			hook('request-pre', 'pre'),
			hook('request-default'),
			hook('request-post', 'post')
		]
	});
	result.value = JSON.stringify(response.body, null, 2);
};
</script>

<style scoped>
.demo { display: grid; width: min(100%, 640px); gap: 12px; padding: 12px; box-sizing: border-box; font: 14px/1.5 system-ui; }
button { width: fit-content; padding: 6px 10px; cursor: pointer; }
pre { margin: 0; padding: 12px; background: #f4f7fb; border-radius: 8px; }
</style>
```
:::

## 真实项目中的 Network 封装

实际 Web 与小程序项目通常不会在业务页面直接配置完整请求，而是先创建一个全局 `Network`，集中处理运行时域名、身份信息、业务状态码和 UI 反馈。Core 允许任意扩展字段，并按“Controller 公共值 → 单次请求值”覆盖；这些字段只有被 Hook 或 Provider 读取时才产生行为。

下面的属性名来自常见项目约定，并不是 `@deot/http` 内置语义。应用可以采用其他名称，但应保持公共默认值、单次覆盖和平台实现的一致性。

| 项目属性 | 常见类型 | 业务层职责 |
| --- | --- | --- |
| `baseUrl` | `string` | 为相对 URL 补充运行时域名。 |
| `token` | `boolean \| string` | 控制是否携带当前或指定令牌。 |
| `json` | `boolean` | 选择 JSON 或 URL encoded 请求体。 |
| `loading` | `boolean \| string` | 加入 Loading 队列并提供提示文字。 |
| `confirmTip` | `boolean \| string` | 发送前执行异步确认。 |
| `errorTip` | `boolean \| string \| Function` | 控制错误提示、Modal 或格式化。 |
| `successTip` | `boolean \| string` | 控制非 GET 成功提示。 |

下面的多文件示例改编自实际项目的全局 Network：`network.js` 组合业务 Hook 和通用数据转换，`provider.js` 代替真实后端，页面只负责调用并展示状态。可以依次运行并发请求、业务失败和 HTTP 失败，观察请求信息、合并后的 Loading、最终响应及去重后的错误提示。

:::playground
<!--
<config lang="json5">
{
	entry: 'App.vue',
	views: ['runtime', 'files'],
	viewport: 'auto',
	viewportOptions: ['auto', 375, [768, 720]]
}
</config>
-->
```vue App.vue
<template>
	<main class="demo">
		<header>
			<div>
				<strong>项目级 Network</strong>
				<p>统一处理配置、请求头、Loading、业务状态码与错误提示</p>
			</div>
			<span class="loading" :class="{ active: loadingCount }">
				{{ loadingText || '当前无请求' }}
			</span>
		</header>

		<section class="actions">
			<button @click="runConcurrent">并发请求</button>
			<button @click="runBusinessError">业务错误</button>
			<button @click="runHttpError">HTTP 错误 + 重试</button>
			<button class="plain" @click="resetDemo">清空面板</button>
		</section>

		<section class="grid">
			<article>
				<h3>提示消息</h3>
				<ul v-if="ui.notices.length">
					<li v-for="notice in ui.notices" :key="notice.id" :class="notice.type">
						{{ notice.type.toUpperCase() }} · {{ notice.message }}
					</li>
				</ul>
				<p v-else class="empty">暂无消息</p>
			</article>

			<article>
				<h3>调用结果</h3>
				<pre>{{ result || '点击上方按钮发送请求' }}</pre>
			</article>
		</section>

		<article>
			<h3>请求日志</h3>
			<Scroller
				class="request-scroller"
				:auto-resize="true"
				:native="false"
				:show-bar="true"
				height="220"
				wrapper-style="overflow-x: hidden;"
			>
				<pre>{{ requestLog }}</pre>
			</Scroller>
		</article>
	</main>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Scroller } from '@deot/vc';
import { Network, resetNetworkDemo, ui } from './network.js';

const result = ref('');
const loadingCount = computed(() => ui.loading.length);
const loadingText = computed(() => {
	if (!ui.loading.length) return '';
	const latest = ui.loading[ui.loading.length - 1].message;
	return `${ui.loading.length > 1 ? `(${ui.loading.length}) ` : ''}${latest}`;
});
const requestLog = computed(() => JSON.stringify(ui.requests, null, 2));

const formatSettled = results => results.map(item => (
	item.status === 'fulfilled'
		? { status: 'fulfilled', body: item.value.body }
		: { status: 'rejected', error: item.reason.statusText }
));

const runConcurrent = async () => {
	result.value = '请求进行中…';
	const results = await Promise.allSettled([
		Network.http('/users', {
			loading: '加载用户…',
			body: { page: 1 },
			delay: 700
		}),
		Network.http('/reports', {
			loading: '生成报表…',
			body: { range: 'week' },
			delay: 1100
		})
	]);
	result.value = JSON.stringify(formatSettled(results), null, 2);
};

const runBusinessError = async () => {
	try {
		await Network.http('/business-error', {
			method: 'POST',
			loading: '提交订单…',
			errorTip: '订单提交失败',
			body: { sku: 'HTTP-001', amount: 2 }
		});
	} catch (response) {
		result.value = JSON.stringify({
			type: response.type,
			status: response.status,
			statusText: response.statusText,
			body: response.body
		}, null, 2);
	}
};

const runHttpError = async () => {
	try {
		await Network.http('/http-error', {
			loading: '连接服务…',
			maxTries: 2,
			interval: 250
		});
	} catch (response) {
		result.value = JSON.stringify({
			type: response.type,
			status: response.status,
			statusText: response.statusText,
			message: response.body?.msg
		}, null, 2);
	}
};

const resetDemo = () => {
	resetNetworkDemo();
	result.value = '';
};
</script>

<style scoped>
.demo { display: grid; gap: 14px; width: min(100%, 900px); padding: 16px; box-sizing: border-box; color: #172033; font: 14px/1.5 system-ui; }
header, article { border: 1px solid #dfe5ef; border-radius: 12px; background: #fff; }
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; }
header strong { font-size: 18px; }
header p, h3 { margin: 4px 0 0; }
.loading { padding: 6px 10px; border-radius: 999px; color: #667085; background: #f2f4f7; white-space: nowrap; }
.loading.active { color: #175cd3; background: #eff8ff; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { padding: 8px 12px; border: 0; border-radius: 8px; color: #fff; background: #2563eb; cursor: pointer; }
button.plain { color: #344054; background: #eef1f5; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
article { min-width: 0; padding: 12px; }
article h3 { margin: 0 0 8px; font-size: 14px; }
ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
li { padding: 7px 9px; border-radius: 7px; background: #ecfdf3; }
li.error { color: #b42318; background: #fef3f2; }
pre { min-height: 42px; margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; font: 12px/1.5 ui-monospace, monospace; }
.request-scroller { height: 220px; }
.request-scroller :deep(.vc-scroller__wrapper) { overflow-x: hidden; }
.empty { margin: 0; color: #98a2b3; }
@media (max-width: 600px) { header { align-items: flex-start; flex-direction: column; } .grid { grid-template-columns: 1fr; } }
</style>
```

```js network.js
import { reactive } from 'vue';
import { HTTPController } from '@deot/http-core';
import { onRequest as transformRequest, onResponse as transformResponse } from '@deot/http-hooks';
import { provider, resetProvider } from './provider.js';

// 实际项目应在 Hook 执行时读取 Context/Store，避免切换环境或登录后仍使用旧值。
const getConfig = () => ({
	baseUrl: 'https://api.example.test',
	token: 'demo-token',
	headerSourceCode: 'docs-web'
});

export const ui = reactive({
	loading: [],
	notices: [],
	requests: []
});

let noticeId = 0;
const notify = (type, message) => {
	// 与真实项目一致：相同错误仍在展示时不重复提示。
	if (type === 'error' && ui.notices.some(item => item.message === message)) return;
	ui.notices.unshift({ id: ++noticeId, type, message });
};

const loadingStore = {
	add(leaf) {
		if (ui.loading.some(item => item.id === leaf.id)) return;
		ui.loading.push({
			id: leaf.id,
			message: typeof leaf.request.loading === 'string' ? leaf.request.loading : '加载中…'
		});
	},
	remove(leaf) {
		const index = ui.loading.findIndex(item => item.id === leaf.id);
		if (index >= 0) ui.loading.splice(index, 1);
	}
};

const errorMap = {
	HTTP_REQUEST_TIMEOUT: '网络超时，请稍后再试',
	HTTP_STATUS_ERROR: '网络异常，请稍后再试'
};

const businessRequest = (leaf) => {
	const request = leaf.request;
	const config = getConfig();

	if (!/^https?:/i.test(request.url)) request.url = config.baseUrl + request.url;
	if (request.method === 'POST') {
		request.headers.set(
			'Content-Type',
			request.json ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8'
		);
	}
	if (request.token !== false) {
		const token = typeof request.token === 'string' ? request.token : config.token;
		request.headers.set('Authorization', `Bearer ${token}`);
	}
	request.headers.set('source', config.headerSourceCode);
	return leaf;
};

const recordRequest = (leaf) => {
	ui.requests.unshift({
		method: leaf.request.method,
		url: leaf.request.url,
		headers: leaf.request.headers.toJSON(),
		body: leaf.request.body,
		maxTries: leaf.request.maxTries
	});
	return leaf;
};

const businessResponse = (leaf) => {
	const { request, response } = leaf;
	const body = response.body;

	// HTTP 200 不代表业务成功：统一改成 Core 能识别的 error response。
	if (response.type !== 'error' && body && body.code !== 200) {
		response.type = 'error';
		response.ok = false;
		response.statusText = typeof request.errorTip === 'string'
			? request.errorTip
			: body.msg || 'BUSINESS_ERROR';
	}

	if (
		request.errorTip
		&& response.type === 'error'
		&& response.statusText !== 'HTTP_CANCEL'
		&& request.maxTries === 1
	) {
		notify('error', errorMap[response.statusText] || response.statusText);
	} else if (request.successTip && request.method !== 'GET' && response.type !== 'error') {
		notify('success', typeof request.successTip === 'string' ? request.successTip : body?.msg);
	}
	return leaf;
};

export const Network = new HTTPController({
	token: true,
	json: true,
	loading: true,
	errorTip: true,
	successTip: false,
	onStart: leaf => leaf.request.loading && loadingStore.add(leaf),
	onFinish: leaf => leaf.request.loading && loadingStore.remove(leaf),
	onRequest: [businessRequest, transformRequest, recordRequest],
	onResponse: [transformResponse, businessResponse],
	provider
});

export const resetNetworkDemo = () => {
	ui.loading.splice(0);
	ui.notices.splice(0);
	ui.requests.splice(0);
	resetProvider();
};
```

```js provider.js
import { HTTPResponse } from '@deot/http-core';

let sequence = 0;
export const resetProvider = () => { sequence = 0; };

export const provider = (request, leaf) => new Promise((resolve, reject) => {
	const timer = setTimeout(() => {
		const path = new URL(request.url).pathname;
		if (path === '/http-error') {
			reject(HTTPResponse.error('HTTP_STATUS_ERROR', {
				status: 503,
				body: JSON.stringify({ code: 503, msg: '模拟服务暂时不可用' })
			}));
			return;
		}

		const body = path === '/business-error'
			? { code: 422, msg: '库存不足', data: ['HTTP-001 仅剩 1 件'] }
			: {
					code: 200,
					msg: '请求成功',
					data: { requestId: `REQ-${++sequence}`, path }
				};
		resolve(new HTTPResponse({
			status: 200,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}));
	}, request.delay || 450);

	// Provider 负责把平台句柄和取消能力接到 Leaf。
	leaf.server = { abort: () => clearTimeout(timer) };
	const cancel = leaf.cancel;
	leaf.cancel = async () => {
		leaf.server.abort();
		await cancel();
	};
});
```
:::

该示例特意保持“Provider → Network → 页面”的单向依赖。替换真实项目时，通常只需把 `provider.js` 换成 Fetch、XHR、Node 或小程序 Provider，并把 `ui` 的提示方法接到项目组件库；业务服务仍然调用同一个 `Network.http()`。

`baseUrl`：可在 `onRequest` 中为相对 URL 补充运行时域名。登录前后、租户切换或环境热更新时，应在 Hook 执行时读取最新配置，不要只在模块初始化时捕获一次。

```ts
const onRequest = (leaf) => {
	if (!/^https?:/i.test(leaf.request.url)) {
		leaf.request.url = getRuntimeConfig().baseUrl + leaf.request.url;
	}
};
```

`token`：可约定 `true` 使用当前登录令牌、字符串使用指定令牌、`false` 跳过鉴权。Core 不内置 Header 名称，Bearer、`token` 或其他协议应由项目 Hook 决定。

```ts
if (leaf.request.token !== false) {
	const value = typeof leaf.request.token === 'string'
		? leaf.request.token
		: getToken();
	leaf.request.headers.set('Authorization', `Bearer ${value}`);
}
```

`json`：可用于控制 POST 请求采用 JSON 还是 URL encoded。使用官方 Client 时，Controller 自定义 `onRequest` 默认先于通用编码 Hook，因此只需先写入 `Content-Type`，后续 Hook 会按该值转换 body。

`loading`：常用 `boolean | string` 表示是否显示全局 Loading 以及提示文字。并发请求应使用计数器或队列，不能让任意一个请求完成就直接关闭全局 Loading。

`onStart` / `onFinish` 是 Shell 级生命周期：一个 Shell 并发 `send()` 多次时各只执行一次。若队列按 `leaf.id` 记录，请确保添加和移除使用同一策略；普通 `Network.http()` 每次创建独立 Shell，不受该差异影响。

`confirmTip`：异步确认可以放在 `onRequest`，Core 会等待 Promise 完成后再调用 Provider。由于 `onStart` 早于 `onRequest`，希望“确认后才显示 Loading”时，应在 `onStart` 跳过带 `confirmTip` 的请求，并在确认成功后手动加入 Loading 队列。

确认 Promise reject 会被 Core 转换为 `HTTP_OPTIONS_REBUILD_FAILED`，而不是 `HTTP_CANCEL`。项目的错误提示 Hook 应识别并过滤这种用户主动关闭场景。

`errorTip`：可约定为布尔值、字符串、Modal 标记或格式化函数。提示前应排除 `HTTP_CANCEL`，并对相同消息去重；开启重试时，可以只在 `leaf.request.maxTries === 1` 的最终尝试提示，避免每次失败都弹出消息。

`successTip`：通常只对非 GET 成功请求提示，并允许字符串覆盖服务端消息。下载导出这类异步任务应由业务状态决定提示时机，不应仅根据 HTTP 200 判断完成。

#### 业务状态码

不少接口使用 HTTP 200 包装业务失败。可以在 `onResponse` 中设置 `statusText` 并把 `type` 改为 `'error'`；Core 会将它纳入重试和 Promise reject 流程。

```ts
const onResponse = (leaf) => {
	const { body } = leaf.response;
	if (body && body.code !== 200 && leaf.response.type !== 'error') {
		leaf.response.statusText = body.msg || 'BUSINESS_ERROR';
		leaf.response.type = 'error';
		leaf.response.ok = false;
	}
	return leaf;
};
```

如果某些响应（例如 Blob 下载）不遵循业务 JSON 结构，应先按 `responseType` 或 body 类型排除，再执行状态码判断。

#### `get`、`post`、`upload` 与 `download`

Core 只内置 `http()` 和 `custom()`，没有这些快捷方法。项目可以围绕 `http()` 创建函数或扩展自己的 Network 类型，但不要把它们当成包的公共 API：

```ts
const get = (url, options = {}) => Network.http(url, {
	...options,
	method: 'GET'
});

const post = (url, options = {}) => Network.http(url, {
	...options,
	method: 'POST'
});
```

API 服务函数可以继续把 `response.body.data` 解包为业务数据，但 Network、Hook 与 Provider 层应保持统一返回 `HTTPResponse`，避免不同平台产生两套返回协议。

小程序上传、下载应由 Adapter 封装 `uni.uploadFile` / `uni.downloadFile`，并继续把成功和失败归一化为 `HTTPResponse`。文件列表、选择图片、批量 `Promise.allSettled`、保存到相册或打开文档属于项目服务层，不建议放入通用 Core Provider。还应保持“底层 Provider → Network → 业务服务”的单向依赖，避免 Provider 导入一个反过来依赖 Network 的上传服务而形成循环引用。

## 请求属性示例与说明

以下属性都可以配置在 `new HTTPController(options)` 作为公共默认值，也可以配置在 `http(url, options)` 覆盖单次请求。

具体类型和默认值见下方 `HTTPRequestOptions` 表。这里仅展开影响请求行为的边界和示例。

`url`：请求地址可以作为第一个字符串参数，也可以放在配置对象中。没有 `url` 且没有有效 `localData` 时，请求以 `HTTP_URL_EMPTY` 失败。

```ts
Network.http('/users');
Network.http({ url: '/users', method: 'GET' });
```

`method`：默认是 `'GET'`。Core 不限制方法字符串；是否规范化大小写、是否允许 body，由接入的 Hooks 和 Provider 决定。

```ts
Network.http('/users/42', { method: 'DELETE' });
```

`headers`：类型接受 `HeadersInit` 或 `HTTPHeaders`，构造请求时统一转换成 `HTTPHeaders`。当前实现不会逐 key 合并公共 headers；单次请求传入 `headers` 时会整体替换公共值。运行时应优先使用普通对象或 `HTTPHeaders`，原生 `Headers` 和 tuple 数组不会像 Web Headers 一样自动遍历归一化。

```ts
Network.http('/users', {
	headers: { Authorization: 'Bearer token' }
});
```

`body`：Core 只保存 body，不负责序列化。官方 Client/Server 会通过 Hooks 转换普通对象；自定义 Provider 应明确支持的 body 类型。

```ts
Network.http('/users', {
	method: 'POST',
	body: { name: 'deot' }
});
```

`mode`、`credentials`、`cache`、`redirect`：这些属性采用 Fetch Request 的语义，默认依次为 `'cors'`、`'same-origin'`、`'default'`、`'follow'`。Core 仅透传，非浏览器 Provider 可以忽略或自行映射。

`referrer`、`referrerPolicy`、`integrity`、`keepalive`：这些也是浏览器 Request 兼容属性，默认分别为 `'about:client'`、`''`、`''`、`false`。在小程序等环境中是否生效取决于自定义 Provider。

`localData`：真值会跳过 Provider，直接成为 `HTTPResponse.body`，并且不执行 `onStart`、`onFinish`。`onRequest` 与 `onResponse` 仍会执行，因此本地数据也会经过项目的请求策略和响应转换。当前实现使用真值判断，所以 `false`、`0`、`''` 和 `null` 不会启用本地响应。

```ts
const response = await Network.http({
	localData: { users: [{ id: 1, name: 'deot' }] }
});
```

是否跳过开始/完成阶段依据 `originalRequest.localData` 判断。在 `onRequest` 中临时写入 `localData` 会绕过 Provider，但不会撤销已经执行的 `onStart`，之后仍会执行 `onFinish`。

`onStart`：一个 Shell 从空闲变为请求中时执行一次。通过 `custom().send()` 并发产生多个 Leaf 时，不会为每个 Leaf 重复执行。支持返回 Promise，后续阶段会等待它完成。

`onFinish`：同一 Shell 的最后一个 Leaf 完成清理时执行一次。支持返回 Promise；`localData` 请求不会触发。当前清理流程不会把 `onFinish` 的异常重新转换为请求错误，reject 还可能阻止 Leaf 最终 settle；因此完成 Hook 应在内部捕获 UI、日志或 Devtools 的异常。

`onRequest`：Provider 前执行，可原地修改 `leaf.request`，也可同步或异步返回新的 `HTTPRequest` 或配置对象。抛错或 Promise reject 会转换为 `HTTP_OPTIONS_REBUILD_FAILED`。

```ts
const Network = new HTTPController({
	onRequest(leaf) {
		leaf.request.headers.set('X-Trace-Id', crypto.randomUUID());
		return leaf;
	}
});
```

`onResponse`：Provider 后执行，可原地修改 `leaf.response`，也可同步或异步返回新的 `HTTPResponse` 或响应配置。抛错或 Promise reject 会转换为 `HTTP_RESPONSE_REBUILD_FAILED`。

`timeout`：默认 `60000` 毫秒；设为 `0` 关闭 Core 计时器。超时以 `HTTP_REQUEST_TIMEOUT` 失败。Provider 也可以实现自己的底层超时，但应避免产生两套不一致的超时语义。

`maxTries`：默认 `1`，表示只请求一次。失败响应或 `type: 'error'` 会触发重试；重试期间不重复执行 `onStart`、`onFinish`。

```ts
Network.http('/unstable', { maxTries: 3 }); // 首次 + 最多两次重试
```

`interval`：默认 `0`，仅在下一次重试前等待；单位是毫秒。它不影响首次请求，也不是轮询周期定时器。

```ts
Network.http('/unstable', { maxTries: 3, interval: 500 });
```

`shared`：真值作为共享 key。只有 key 相同且整个请求可被 `JSON.stringify` 为相同结果时才复用已有 `HTTPShellLeaf`；完成后的成功共享请求需用 `removeShared` 或 `clear` 主动清理。

```ts
const first = Network.http('/profile', { shared: 'current-user' });
const second = Network.http('/profile', { shared: 'current-user' });
const reused = first === second; // true
await Network.removeShared('current-user');
```

共享 key 也可以是稳定的函数或对象引用，匹配时先使用严格相等；每次重新创建的箭头函数或对象不会命中同一 key。无论 key 类型如何，其余请求字段仍通过 `JSON.stringify` 比较，函数和 `undefined` 字段不会参与序列化结果。

`provider`：Provider 是唯一与运行端绑定的属性。它必须返回 `Promise<HTTPResponse>`；失败时应 reject `HTTPResponse.error(...)`，不要直接 reject 普通 `Error`，因为 Core 会把 Provider 的 reject 值先标准化为响应。需要取消底层任务时，应保留并包装 Core 已写入的 `leaf.cancel`，不要直接丢弃它。

## 响应与 Leaf 属性说明

| 对象 | 属性 | 类型/默认值 | 说明 |
| --- | --- | --- | --- |
| `HTTPResponse` | `body` | `T`，默认 `null` | 响应载荷；Core 不自动解析，官方 Hooks 只尝试解析字符串 JSON。 |
| `HTTPResponse` | `headers` | `HTTPHeaders` | 标准化响应头；key 的大小写取决于 Provider 写入方式。 |
| `HTTPResponse` | `status` / `statusText` | `200` / `''` | 数字状态与状态文本；库错误代码通常写入 `statusText`。 |
| `HTTPResponse` | `ok` / `type` | `true` / `'default'` | `HTTPResponse.error()` 固定为 `false` / `'error'`，驱动重试和 reject。 |
| `HTTPResponse` | `url` / `redirected` | `''` / `false` | Core 不推导，Provider 需要时应显式写入。 |
| `HTTPShellLeaf` | `id` | `string` | 每次 `send()` 生成，可用于精确取消。 |
| `HTTPShellLeaf` | `originalRequest` / `request` | `HTTPRequest` | `onRequest` 前的请求与实际 Provider 输入。 |
| `HTTPShellLeaf` | `originalResponse` / `response` | `HTTPResponse?` | Provider 原始结果与 `onResponse` 后结果。 |
| `HTTPShellLeaf` | `target` / `cancel` | `Promise` / `Function` | 底层 Promise 与取消入口；Promise-like 方法委托给 `target`。 |

请求和响应的“原始值 / 当前值”都是浅层分离，`body` 等引用仍可能共享，并不是不可变的深拷贝快照。请求返回前，`originalResponse` 和 `response` 可能为 `undefined`。

Leaf 是请求执行期句柄，不是长期结果对象。非共享请求完成清理时会删除 Leaf 的自有字段；应保存 `await leaf` 返回的 `HTTPResponse`，不要在完成后继续读取 `leaf.response`、重复 `await leaf` 或再次调用 `leaf.cancel()`。成功的共享 Leaf 会保留到 `removeShared()` / `clear()`，但仍建议业务层持有标准响应而不是依赖内部 Leaf 状态。

## API

| 导出 | 说明 |
| --- | --- |
| `HTTPController` | 请求控制器和 Shell 管理器。 |
| `HTTPRequest` / `HTTPRequestOptions` | 标准化请求及其配置类型。 |
| `HTTPResponse` / `HTTPResponseOptions` | 标准化响应及其配置类型。 |
| `HTTPHeaders` | 可序列化的请求/响应头容器。 |
| `HTTPShell` | 可重复发送的请求容器。 |
| `HTTPShellLeaf` | 单次请求的 Promise-like 句柄。 |
| `HTTPProvider` | 平台传输层函数类型。 |
| `HTTPHook` | 生命周期 Hook 类型。 |
| `ERROR_CODE` | 内置错误代码表。 |

### HTTPController

请求控制器和 Shell 管理器。构造函数接收可选 `HTTPRequestOptions`，创建公共请求配置和空 Shell 列表。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `new HTTPController(options?)` | `HTTPRequestOptions` | `HTTPController` | 创建控制器。 |
| `http(url, options?)` | `string \| HTTPRequest \| HTTPRequestOptions`、可选单次配置 | `HTTPShellLeaf<T>` | 创建并立即发送，可直接 `await`。 |
| `custom(url, options?)` | 同 `http()` | `HTTPShell<T>` | 创建可重复调用 `send()` 的 Shell。 |
| `cancel(id?)` | Leaf id 或 `HTTPShellLeaf`；可省略 | `Promise<void>` | 取消指定请求或全部普通请求。 |
| `removeShared(shared?)` | 共享 key；可省略 | `Promise<void>` | 取消并移除匹配或全部共享 Shell。 |
| `clear()` | — | `Promise<void>` | 清理普通请求和共享请求。 |

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `request` | `HTTPRequest` | Controller 的公共默认配置；单次请求以它作为父请求进行合并。 |
| `shells` | `HTTPShell[]` | 当前管理的 Shell；通常只用于诊断，不应由业务代码直接修改。 |

`_getShell`、`_add`、`_remove` 是 Core 管线使用的内部方法，不属于稳定业务 API。

### HTTPRequest

标准化请求对象。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `new HTTPRequest(url, options?, parent?)` | URL、已有请求或完整配置；当前覆盖项；可选父请求 | `HTTPRequest` | 按“默认值 → 父请求 → 当前请求 → 单次配置”的优先级创建请求，并合并、去重 Hook。 |

实例包含 `HTTPRequestOptions` 的全部标准化属性；`headers` 固定为 `HTTPHeaders`，四类 Hook 固定为数组。`bodyUsed` 当前只是与 Web Request 对齐的预留属性，没有读取 body 的实现。

### HTTPRequestOptions

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | `string` | — | 请求 URL；使用 `localData` 时可省略。 |
| `method` | `string` | `'GET'` | HTTP 方法。 |
| `headers` | `HeadersInit \| HTTPHeaders` | `{}` | 请求头，构造时转为 `HTTPHeaders`。 |
| `body` | `{ } \| BodyInit \| null` | `null` | 请求体；实际支持范围由 Provider/Hooks 决定。 |
| `mode` | `RequestMode` | `'cors'` | 标准 Request 字段。 |
| `credentials` | `RequestCredentials` | `'same-origin'` | 标准 Request 字段。 |
| `cache` | `RequestCache` | `'default'` | 标准 Request 字段。 |
| `redirect` | `RequestRedirect` | `'follow'` | 标准 Request 字段。 |
| `referrer` | `string` | `'about:client'` | 标准 Request 字段。 |
| `integrity` | `string` | `''` | 标准 Request 字段。 |
| `keepalive` | `boolean` | `false` | 标准 Request 字段。 |
| `referrerPolicy` | `ReferrerPolicy` | `''` | 标准 Request 字段。 |
| `localData` | `any` | `null` | 跳过 Provider，直接作为成功响应 body；假值不会跳过。 |
| `timeout` | `number` | `60000` | Core 超时毫秒数；`0` 关闭。 |
| `maxTries` | `number` | `1` | 包含首次请求的最大尝试次数。 |
| `interval` | `number` | `0` | 重试前等待毫秒数，仅 `maxTries > 1` 有效。 |
| `shared` | `any` | `null` | 共享 key；真值启用请求复用。 |
| `onStart` / `onFinish` | `HTTPHook \| HTTPHook[]` | `[]` | Shell 首次开始/全部 Leaf 完成时执行；`localData` 不触发。 |
| `onRequest` / `onResponse` | `HTTPHook \| HTTPHook[]` | `[]` | Provider 前/后执行。 |
| `provider` | `HTTPProvider` | 回显 `request.body` | 实际发送函数。 |
| `[key: string]` | `any` | — | 允许 Adapter 扩展平台参数。 |

### HTTPProvider

```ts
type HTTPProvider = (
	request: HTTPRequest,
	leaf: HTTPShellLeaf
) => Promise<HTTPResponse>;

type HTTPHook<T = any> = (leaf: HTTPShellLeaf) => T | {
	enforce: 'pre' | 'post' | null;
	handler: (leaf: HTTPShellLeaf) => T;
};
```

`HTTPProvider` 接收标准化请求和当前 Leaf，返回 `Promise<HTTPResponse>`。Provider 负责把目标运行端的成功、失败与取消能力映射到 Core。

### HTTPHook

Hook 可以返回 Promise，Core 会按顺序等待。返回 `false` 只会中断当前阶段剩余 Hook，不会取消请求。`onRequest` 返回 `HTTPRequest` 或配置对象可重建请求；`onResponse` 返回 `HTTPResponse` 或响应配置对象可重建响应；返回当前 Leaf 或 `true` 表示保留已原地修改的值。不显式返回值时，会以当前 `leaf.request` / `leaf.response` 重新构建，原地修改同样保留。

运行时还接受 `{ enforce, handler }` 作为单个 Hook 配置，其中 `enforce` 为 `'pre'`、`'post'` 或 `null`。当前导出的 `HTTPHook` 类型声明把该对象写在函数返回联合中；TypeScript 直接传对象字面量时可能需要显式类型断言，运行顺序见本页 `enforce` 示例。

### HTTPShell

可重复发送的请求容器；构造参数为 URL/请求配置、可选单次配置和父 `HTTPController`，通常由 `HTTPController.custom()` 创建。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `send()` | — | `HTTPShellLeaf<T>` | 发送一次；共享请求存在时返回已有 Leaf。 |
| `cancel(id?)` | Leaf id 或 `HTTPShellLeaf`；可省略 | `Promise<void>` | 取消指定或全部 Leaf。 |
| `task(leaf, hooks, done?)` | Leaf、Hook 数组、可选结果回调 | `Promise<void>` | 排序并执行 Hook；返回 `false` 时停止当前阶段。 |
| `clear(leaf)` | `HTTPShellLeaf` | `Promise<void>` | 清理计时器，执行完成阶段并按共享状态移除 Leaf。 |
| `clearByLeafId(id)` | `string` | `void` | 清空指定 Leaf，Shell 为空时从 Controller 移除。 |
| `removeIfShared(shared?)` | 可选共享 key | `Promise<void>` | 匹配时取消并移除共享 Leaf。 |
| `loading(leaf)` | `HTTPShellLeaf` | `Promise<void>` | 执行 `onStart` 阶段。 |
| `loaded(leaf)` | `HTTPShellLeaf` | `Promise<void>` | 执行 `onFinish` 阶段。 |
| `before(leaf)` | `HTTPShellLeaf` | `Promise<void>` | 执行并重建 `onRequest` 结果。 |
| `after(leaf)` | `HTTPShellLeaf` | `Promise<void>` | 调用 Provider，执行并重建 `onResponse` 结果。 |
| `error(leaf, statusText, body?)` | Leaf、错误文本、可选诊断 body | `HTTPResponse` | 创建错误响应。 |

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `parent` | `HTTPController` | 创建并管理当前 Shell 的 Controller。 |
| `request` | `HTTPRequest` | 合并 Controller 公共配置后的请求。 |
| `leafs` | `Record<string, HTTPShellLeaf<T>>` | 按 id 保存当前 Shell 的执行中或共享 Leaf。 |
| `isPending` | `boolean` | 是否处于请求周期中，用于保证并发 `send()` 只触发一次 `onStart` / `onFinish`。 |

除 `send`、`cancel` 外，其余方法主要用于 Core 生命周期管线；业务代码通常通过 Hook 扩展流程，不直接调用这些方法。

### HTTPShellLeaf

单次请求的 Promise-like 句柄。构造函数接收 `HTTPRequest`，并分别保存为 `originalRequest` 和可修改的 `request` 副本。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `cancel()` | — | `Promise<void>` | 取消当前请求，并在 Provider 支持时中止底层任务。 |
| `then(resolve, reject?)` | Promise fulfillment/rejection 回调 | 同 `target.then()` | 订阅成功或失败结果。 |
| `catch(callback?)` | Promise rejection 回调 | 同 `target.catch()` | 订阅失败结果。 |
| `finally(callback?)` | 完成回调 | 同 `target.finally()` | 请求结束后执行回调。 |

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 单次请求唯一 id。 |
| `timeout` | `ReturnType<typeof global.setTimeout>?` | Core 超时计时器句柄，请求清理后失效。 |
| `originalRequest` / `request` | `HTTPRequest` | Hook 执行前与 `onRequest` 处理后的请求。 |
| `originalResponse` / `response` | `HTTPResponse?` | Provider 原始响应与 `onResponse` 处理后的响应；返回前可能未定义。 |
| `target` | `Promise<HTTPResponse<T>>` | 底层 Promise，Leaf 的 Promise-like 方法都委托给它。 |
| `[key: string]` | `any` | Provider 可写入 `server` 等运行端句柄。 |

普通非共享请求完成时，`clearByLeafId()` 会删除 Leaf 的自有字段并从 Shell 移除；以上成员描述的是请求执行期间可供 Hook、Provider 和调用方使用的状态。最终业务结果是 `target` resolve 的 `HTTPResponse<T>`。

### HTTPResponse

标准化响应对象。

| 方法 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `new HTTPResponse(body?, options?)` | body、现有响应或响应配置；可选覆盖配置 | `HTTPResponse<T>` | 标准化响应，并把 headers 转为 `HTTPHeaders`。 |
| `HTTPResponse.error(statusText?, options?)` | 可选错误文本、响应配置 | `HTTPResponse` | 创建 `type: 'error'`、`ok: false` 的错误响应。 |

普通对象首参会被识别为 `HTTPResponseOptions`。需要把普通对象作为响应 body 时，应使用 `new HTTPResponse({ body: data })`，不能直接使用 `new HTTPResponse(data)`。实例包含下表全部响应属性。`bodyUsed` 当前是兼容 Web Response 的预留属性，没有流读取状态实现。

### HTTPResponseOptions

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `body` | `{ } \| BodyInit \| null` | `null` | 响应体。 |
| `headers` | `HeadersInit \| HTTPHeaders` | `{}` | 响应头。 |
| `status` | `number` | `200` | 状态码。 |
| `statusText` | `string` | `''` | 状态或错误代码。 |
| `url` | `string` | `''` | 最终 URL。 |
| `redirected` | `boolean` | `false` | 是否发生重定向。 |
| `type` | `ResponseType` | `'default'` | 响应类型；错误响应为 `'error'`。 |
| `ok` | `boolean` | `true` | 是否成功。 |

`HTTPResponse.error(statusText?, options?)` 返回 `body: null`、`status: 0`、`type: 'error'`、`ok: false` 的响应；传入的 `options` 可覆盖 body、headers、status 等字段，但 `type`、`ok` 和参数 `statusText` 由错误工厂固定。

### HTTPHeaders

可序列化的请求/响应头容器。

| 方法/访问器 | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `new HTTPHeaders(headers?)` | `HTTPHeaders \| object \| HeadersInit` | `HTTPHeaders` | 创建并写入初始值。 |
| `set(key, value, rewrite?)` | 字段名、值、可选覆盖开关 | `this` | 写入单个字段；`rewrite: true` 强制覆盖。 |
| `set(headers, rewrite?)` | 多个字段、可选覆盖开关 | `this` | 批量写入，规则同单字段重载。 |
| `has(key)` | `string` | `boolean` | 按当前 key 精确检查真值。 |
| `get(key)` | `string` | `any` | 按当前 key 精确读取值。 |
| `toJSON()` | — | 无原型对象 | 输出自有且为真值的头。 |
| `[Symbol.toStringTag]` | — | `'HTTPHeaders'` | 返回自定义对象类型标签。 |

字段名不会自动转为小写；运行时构造参数优先使用普通对象或 `HTTPHeaders`。

### ERROR_CODE

| 错误码 | 触发场景 |
| --- | --- |
| `HTTP_URL_EMPTY` | `onRequest` 完成后既没有 URL，也没有有效 `localData`。 |
| `HTTP_RESPONSE_REBUILD_FAILED` | `onResponse` 抛错、reject，或响应重建失败。 |
| `HTTP_OPTIONS_REBUILD_FAILED` | `onRequest` 抛错、reject，或请求重建失败。 |
| `HTTP_CANCEL` | Leaf 被主动取消。 |
| `HTTP_REQUEST_TIMEOUT` | Core 或平台 Provider 请求超时。 |
| `HTTP_STATUS_ERROR` | Client/Server Provider 收到非 2xx 或底层传输错误。 |
| `HTTP_CODE_ILLEGAL` | Client JSONP 回调名无效或已被占用。 |
| `HTTP_RESPONSE_PARSING_FAILED` | Fetch/XHR 按 `responseType` 读取响应失败。通用 JSON Hook 解析失败不会使用此错误码。 |
