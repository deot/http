[ci-image]: https://github.com/deot/http/actions/workflows/ci.yml/badge.svg?branch=main
[ci-url]: https://github.com/deot/http/actions/workflows/ci.yml

[![build status][ci-image]][ci-url]

# deot/http

用于JS开发的请求工具

## Monorepo

[npm-shared-image]: https://img.shields.io/npm/v/@deot/http-shared.svg
[npm-shared-url]: https://www.npmjs.com/package/@deot/http-shared

[npm-core-image]: https://img.shields.io/npm/v/@deot/http-core.svg
[npm-core-url]: https://www.npmjs.com/package/@deot/http-shared

[npm-client-image]: https://img.shields.io/npm/v/@deot/http-client.svg
[npm-client-url]: https://www.npmjs.com/package/@deot/http-shared

[npm-hooks-image]: https://img.shields.io/npm/v/@deot/http-hooks.svg
[npm-hooks-url]: https://www.npmjs.com/package/@deot/http-hooks

[npm-server-image]: https://img.shields.io/npm/v/@deot/http-server.svg
[npm-server-url]: https://www.npmjs.com/package/@deot/http-server

[npm-image]: https://img.shields.io/npm/v/@deot/http.svg
[npm-url]: https://www.npmjs.com/package/@deot/http

| 包名                        | 版本                                         | 说明                                             |
| ------------------------- | ------------------------------------------ | ---------------------------------------------- |
| [core](packages/core)     | [![npm][npm-core-image]][npm-core-url]     | 控制中心，只需实现`provider`，即可实现基于JS`*`端的请求体           |
| [client](packages/client) | [![npm][npm-client-image]][npm-client-url] | `Browser`端请求体                                  |
| [server](packages/server) | [![npm][npm-server-image]][npm-server-url] | `Node`端请求体                                     |
| [hooks](packages/hooks)   | [![npm][npm-hooks-image]][npm-hooks-url]   | 用于对`onRequest`和`onResponse`增强                  |
| [shared](packages/shared) | [![npm][npm-shared-image]][npm-shared-url] | 公共方法（暂无）                                       |
| [index](packages/index)   | [![npm][npm-image]][npm-url]               | 自动匹配使用`@deot/http-client`还是`@deot/http-server` |

## Contributing

这是一个 [monorepo](https://en.wikipedia.org/wiki/Monorepo) 仓库 ，使用 [pnpm](https://pnpm.io/) 管理

#### 安装环境

```console
$ npm run init 

$ 或
$ pnpm install
```

#### 添加依赖或添加新的包

```console
$ npm run add
```

#### 关联

```console
$ npm run link
```

#### 测试

```console
$ npm run test

# 或者 直接添加参数
$ npm run test -- --package-name '**' --watch
```

#### 开发

```console
$ npm run dev

# 或者 直接添加参数
$ npm run dev -- --package-name '**'
```

#### 打包

```console
$ npm run build

# 或者 直接添加参数
$ npm run build -- --package-name '**'
```

#### 代码检查

```console
$ npm run lint
```

#### 发布/自动生成 ChangeLog

```console
$ npm run release
```

##### 可选参数

| 参数                        | 备注                                                      |
| ------------------------- | ------------------------------------------------------- |
| `--no-dry-run`            | 默认`dry run`不输出任何文件                                      |
| `--no-tag`                | 默认输出`tag`                                               |
| `--no-publish`            | 默认发布到`npm`                                              |
| `--no-commit`             | 默认提交到`git commit`                                       |
| `--no-push`               | 默认执行`git push`                                          |
| `--force-update-package`  | 即时没找到commit也会强制更新, 如`@xxx/xxx,@xxx/xxx`或`**`，不输入会弹出确认框` |
| `--skip-update-package`   | 跳过要更新的包，如`@xxx/xxx,@xxx/xxx`或`**`，不输入会弹出确认框             |
| `--custom-version`        | 指定更新版本号，如`x.x.x`，不输入会弹出输入框                              |
| `--patch,--major,--minor` | 自动更新版本号的格式                                              |

##### `Commit`收录的格式

- `break change`
- `feat`
- `fix`
- `style`
- `perf`
- `types`
- `refactor`
- `chore`

> 自动增加`PR`和`issue`的地址, `commit`内含`Breaking Change`会自动把版本改为`major`

```shell
refactor(index): remove deprecated \n BREAKING CHANGE: any

fix(index): ci tag (#2)

fix(shared): error (close #1)
```

##### `Commit`无影响的格式

```shell
fix: invaild commit
```

## 关联

[CONTRIBUTING](./.github/CONTRIBUTING.md)

[LICENSE (MIT)](./LICENSE)