# @deot/http-shared

`@deot/http-shared` 提供可复用的 TypeScript 基础类型。目前运行时仅导出空对象 `Utils`。

## 何时使用

- 需要与本仓库一致的索引对象、可空类型、交叉扩展类型或计时器句柄类型。
- 只消费类型，不希望引入 Core 或平台 Adapter。

## 安装

```bash
pnpm add @deot/http-shared
```

## 基础用法

```ts
import type { Customized, Nullable, Options } from '@deot/http-shared';

type RequestMeta = Options<{
	traceId: string;
}>;

type User = Customized<
	{ id: number; name: string },
	{ avatar: Nullable<string> }
>;
```

## 运行时说明

类型在编译后会被擦除，`Utils` 当前也没有方法，因此没有可观察的浏览器运行行为。上面的 TypeScript 示例可以直接交给 `tsc` 检查；需要运行时请求示例请查看 [`@deot/http-core`](../core/README.md#httpcontroller-与-provider-生命周期)。

## 类型参数说明

`Indexable<T = any>` 的 `T` 控制所有字符串属性值的类型；不传时为 `any`。若每个属性结构固定，应优先声明普通 interface，而不是使用 `Indexable`。

`Hash<T>` 的 `T`：`Hash` 只是 `Indexable<T>` 的语义别名，源码没有提供默认泛型，因此使用时应显式传入值类型。

`Options<T = {}>` 的 `T` 描述已知属性，同时通过 `Indexable` 保留任意扩展字段。由于索引值是 `any`，它强调兼容扩展，而不是严格封闭对象。

`AnyFunction<T = void>` 的 `T` 只约束返回值，参数始终是 `any[]`。需要精确参数类型时应声明专用函数类型。

`Nullable<T>` 的 `T` 仅增加 `null`，不会自动增加 `undefined`。需要同时支持两者时使用 `Nullable<T> | undefined`。

`Customized<Origin, Extend>` 的两个参数通过交叉类型把原结构与扩展结构组合起来；同名且不兼容的属性可能收窄为 `never`，使用时需避免冲突。

`TimeoutHandle` 没有泛型参数，值由当前类型环境中的 `global.setTimeout` 推断，因此同时适合 Browser 与 Node。

`Utils` 当前值固定为 `{}`，没有属性、方法或初始化参数。它是预留运行时命名空间，不应依赖尚未存在的成员。

## API

| API | 类别 | 定义或当前值 | 说明 |
| --- | --- | --- | --- |
| `Indexable<T = any>` | 类型 | `{ [key: string]: T }` | 字符串 key 到 `T` 的索引对象。 |
| `Hash<T>` | 类型 | `Indexable<T>` | `Indexable` 的别名；`T` 必须显式传入。 |
| `Options<T = {}>` | 类型 | `Indexable & T` | 任意键值对象与指定结构的交集。 |
| `AnyFunction<T = void>` | 类型 | `(...args: any[]) => T` | 任意参数函数，默认返回 `void`。 |
| `Nullable<T>` | 类型 | `T \| null` | 可空类型，不包含 `undefined`。 |
| `Customized<Origin = any, Extend = any>` | 类型 | `Origin & Extend` | 原类型与扩展类型的交集。 |
| `TimeoutHandle` | 类型 | `ReturnType<typeof global.setTimeout>` | 自动适配 Browser 数字 id 或 Node Timeout。 |
| `Utils` | 运行时值 | `{}` | 预留命名空间，目前没有公共属性或方法。 |
