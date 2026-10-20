# @deot/http-server

`@deot/http-server` 是 Node 适配包，基于 `node:http`、`node:https` 和 `follow-redirects` 发送请求，并复用 Core 控制能力与通用 Hooks。

## 何时使用

- 只需要 Node 构建，不需要 Browser 自动适配。
- 需要流式响应、Buffer 响应、重定向控制或 Node `RequestOptions`。
- 需要在 Node 中发送 FormData、Blob、Buffer、ArrayBuffer 或 Readable Stream。

## 安装

```bash
pnpm add @deot/http-server
```

## 基础用法

```ts
import { createInstance, Network } from '@deot/http-server';

const response = await Network.http('https://example.com/api.json');
const InternalNetwork = createInstance({
	timeout: 10_000,
	headers: { 'User-Agent': 'deot-http' }
});

await InternalNetwork.http('https://example.com/users', {
	method: 'POST',
	body: { name: 'deot' }
});
```

## 可运行 Node 示例

Server Provider 依赖 Node 内置模块，不能直接在浏览器中运行。下面的完整脚本创建临时本地服务并请求它，不依赖外部 API：

```ts
import { createServer } from 'node:http';
import { Network } from '@deot/http-server';

const server = createServer((request, response) => {
	response.setHeader('Content-Type', 'application/json');
	response.end(JSON.stringify({ method: request.method, ok: true }));
});

server.listen(0, '127.0.0.1', async () => {
	const address = server.address();
	if (!address || typeof address === 'string') return;

	try {
		const response = await Network.http(`http://127.0.0.1:${address.port}/health`);
		process.stdout.write(`${response.status} ${JSON.stringify(response.body)}\n`);
	} finally {
		server.close();
	}
});
```

## Stream 与请求体

```ts
const response = await Network.http('https://example.com/file', {
	responseType: 'stream'
});
response.body.pipe(process.stdout);
```

FormData 会转换为 Readable Stream 并补齐 multipart headers；Blob/File 总会补齐 Content-Length，非空时才按自身类型补齐 Content-Type；普通对象仍先经过通用 Hooks。

## Node 属性示例与说明

`maxRedirects`：设为 `0` 时直接使用 `node:http` 或 `node:https`，3xx 不会自动跟随；其他值交给 `follow-redirects`。需要限制重定向次数时传入明确的正整数。

```ts
Network.http('https://example.com/moved', { maxRedirects: 5 });
```

`responseType`：`'stream'` 在收到响应头后立即返回 `IncomingMessage`；`'arraybuffer'` 会完整收集后返回 Node `Buffer`；其他值返回 UTF-8 字符串。名称沿用 Web API，但当前 `'arraybuffer'` 的运行时值并不是原生 `ArrayBuffer`。

`maxContentLength`：限制非 Stream 响应累计的字节数，默认 `Infinity`。设为 `-1` 关闭限制；超过限制返回状态文本 `HTTP_CONTENT_EXCEEDED`。Stream 模式由消费方自行控制流量和背压。

```ts
Network.http('/payload.json', { maxContentLength: 1024 * 1024 });
```

`timeout`：单位为毫秒。到期后销毁底层 `ClientRequest` 并返回 `HTTP_REQUEST_TIMEOUT`。这是整个请求的计时器，不等同于 socket idle timeout。

`body`：Readable Stream 通过 `.pipe(req)` 发送；其他合法值交给 `req.end(body)`。FormData、Blob/File 和 ArrayBuffer 会在 Server Hook 中先转换，普通对象会更早经过通用 Hook。

`agent`、`auth`、`family`、`lookup` 等 Node 选项：Provider 会把未消费的额外字段继续传给 `http.request`/`https.request`。这些属性没有统一默认值，具体语义跟随当前 Node `RequestOptions`。

```ts
import { Agent } from 'node:https';

Network.http('https://internal.example.com', {
	agent: new Agent({ keepAlive: true }),
	family: 4
});
```

`leaf.server`：请求发送后保存底层 `ClientRequest`。它主要供诊断和高级集成使用；常规取消应调用 `leaf.cancel()`，以同时完成 Core 清理。

## API

| API | 参数/类型 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `createInstance(options?)` | `HTTPRequestOptions`，默认 `{}` | `HTTPController` | 创建带 Server Provider、通用 Hooks 和 Node 请求体 Hook 的独立控制器。 |
| `Network` | `HTTPController` | — | `createInstance({})` 创建的默认共享 Node 实例。 |

需要不同 Agent、认证信息或生命周期配置时，应创建独立实例。上面的本地 Node 服务示例展示了请求输入与响应输出。

控制器的完整方法、生命周期、取消、重试和共享参数见 [`@deot/http-core API`](../core/README.md#api)。Leaf 的 `server` 属性为底层 `ClientRequest`，取消 Leaf 会调用 `destroy()`。

未设置 `enforce` 时，`createInstance` 的 Controller 级 `onRequest` 顺序是“自定义 Hook → 通用请求转换 → Node 请求体转换”，Controller 级 `onResponse` 则是“通用 JSON 解析 → 自定义 Hook”。单次请求 Hook 由 Core 合并在这些 Hook 之前；需要跨层固定顺序时使用 `enforce: 'pre' | 'post'`。

### Node 请求参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `maxRedirects` | `number` | `follow-redirects` 默认值 | `0` 使用 Node 原生 transport；其他值使用 `follow-redirects`。 |
| `responseType` | `'stream' \| 'arraybuffer' \| string` | 文本 | `'stream'` 返回 `IncomingMessage`；`'arraybuffer'` 实际返回 `Buffer`；其他值返回 UTF-8 字符串。 |
| `maxContentLength` | `number` | `Infinity` | 非 stream 响应最大字节数；`-1` 也表示不限制，超出返回 `HTTP_CONTENT_EXCEEDED`。 |
| `timeout` | `number` | `60000` | 毫秒；超时销毁 `ClientRequest` 并返回 `HTTP_REQUEST_TIMEOUT`。 |
| `body` | `string \| ArrayBuffer \| Buffer \| Blob \| FormData \| Readable \| null` | `null` | Hook 转换后的请求体；有 `.pipe()` 时直接 pipe，否则传给 `req.end()`。 |
| Node RequestOptions 扩展 | `any` | — | 除已消费字段外继续传给 `http.request`/`https.request`，如 `agent`、`auth`、`family`、`lookup`。 |

### 响应

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `status` | `number \| undefined` | `IncomingMessage.statusCode`。 |
| `headers` | `HTTPHeaders` | 由 Node 响应头构造。 |
| `body` | `IncomingMessage \| Buffer \| string` | 由 `responseType` 决定。 |
| `ok` / `type` | `boolean` / `ResponseType` | 仅 200–299 成功；其他状态返回 error response。 |

### Leaf 属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `leaf.server` | `ClientRequest` | 底层请求句柄；常规取消应调用 `leaf.cancel()`，以同时销毁请求并完成 Core 清理。 |

Server Provider 当前只从 `IncomingMessage` 映射 `status`、`headers` 和 `body`；`url`、`statusText`、`redirected` 等其他字段沿用 Core 默认值。非 2xx 响应的 `body` 默认是 `null`，如需读取错误响应流，应在自定义 Provider 中实现。
