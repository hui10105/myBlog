---
title: "TypeScript 类型收窄：把运行时判断变成编译期保证"
description: "梳理 typeof、in、类型谓词等手段的适用边界，解释控制流分析为何在闭包里失效，并给出避免用 as 断言掩盖问题的判断标准。"
date: 2025-08-29
tags: ["TypeScript", "前端", "类型系统"]
category: "学习笔记"
difficulty: "进阶"
draft: false
summary:
  - "收窄的本质是让编译器跟随运行时的分支判断，逐步把联合类型缩小到可用成员"
  - "判别联合加 switch 加 never 兜底，是表达状态机最省心也最难写错的写法"
  - "闭包和可变绑定会让控制流分析失效，收窄结果在被回调捕获时不能想当然地沿用"
  - "自定义类型谓词必须自己守住前提，断言写错时编译器不会替你兜底"
---

接口返回的数据渲染不出来，控制台里却只看到一句 `Cannot read properties of undefined`。排查到最后发现，问题出在一处 `as` 断言：我以为拿到的一定是成功响应，于是写了 `(res as SuccessResponse).data.name`，而实际上那条分支里 `data` 根本不存在。断言帮我把编译错误压下去了，也顺手把错误推到了运行时。

从那以后，我把「先用断言让它编过」改成了「先让类型表达清楚，再让编译器自己收窄」。

## 收窄在做什么

TypeScript 的联合类型像一组并集，在没有判断之前你只能访问所有成员的公共部分。收窄就是编译器跟着 `if`、`switch`、`typeof` 这些控制流语句，把当前分支里变量的可能类型一步步砍小。

最可靠的载体是判别联合：每个成员带一个字面量字段作为标签，靠它做分支判断。

```ts
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; items: string[] }
  | { status: "error"; message: string };

function render(state: LoadState): string {
  switch (state.status) {
    case "idle":
      return "等待开始";
    case "loading":
      return "加载中";
    case "ok":
      // 这里 state 被收窄成带 items 的成员
      return `共 ${state.items.length} 条`;
    case "error":
      return `失败：${state.message}`;
    default: {
      // 如果哪天新增了一个成员而忘记处理，这里会编译报错
      const never: never = state;
      throw new Error(`未处理的状态: ${JSON.stringify(never)}`);
    }
  }
}
```

`never` 兜底看起来是多余的三行，实际是我最喜欢的一处保险：以后给 `LoadState` 增加 `"refreshing"` 成员时，所有漏改的 `switch` 会自动变成编译错误。

## 常见手段的适用边界

| 手段 | 适合的场景 | 需要注意的点 |
| --- | --- | --- |
| `typeof` | 原始类型、函数 | 只能区分 `object`、`function` 等粗粒度结果，`null` 属于 `object` |
| `in` | 对象是否拥有某属性 | 属性名写错不会报错，只会在运行时永远走 else |
| `instanceof` | 类实例、内置对象 | 跨 iframe 或跨包多版本时会因原型链不同而失效 |
| `Array.isArray` | 数组与单个对象之间 | 只判断是不是数组，不校验元素类型 |
| 自定义类型谓词 | 复杂结构校验 | 是自己写的断言，前提错了编译器不管 |

表格里最容易出问题的是自定义谓词。它的签名 `value is T` 是我给编译器的承诺，编译器不会验证这个承诺是否成立：

```ts
type ApiError = { code: number; message: string };

// 判断是不是错误对象：注意必须排除 null，否则访问属性会抛异常
function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

try {
  await submitForm();
} catch (error: unknown) {
  // catch 里的变量是 unknown，先收窄再使用
  if (isApiError(error)) {
    showToast(`[${error.code}] ${error.message}`);
  } else {
    showToast("未知错误，请稍后重试");
  }
}
```

`catch` 的变量类型从 `any` 改成 `unknown` 之后，我才发现旧代码里有七处直接读了 `error.message`，其中一处读的是被 reject 的字符串，页面上因此显示过 `undefined`。

## 收窄为什么会突然消失

有三个写法我反复踩过，值得单独记下来：

1. 解构把判别字段拆出来。`const { status, items } = state` 之后，`status` 只是一个普通字符串变量，`items` 不会跟着被收窄。
2. 用 `let` 变量保存收窄后的结果。变量可以被重新赋值，编译器不再信任之前的判断。
3. 在回调里沿用外面的收窄结论。下面这段是我真实写过的错误代码：

```ts
let payload: string | null = readPayload();

if (payload !== null) {
  // 报错：payload 可能被重新赋值，回调执行时收窄已失效
  setTimeout(() => console.log(payload.length), 0);
}

// 正确做法：把收窄后的值存进 const 常量再捕获
const snapshot = payload;
if (snapshot !== null) {
  setTimeout(() => console.log(snapshot.length), 0);
}
```

原因很朴素：回调可能在很久之后才执行，中间任何一次赋值都能让类型判断过期，所以编译器干脆放弃收窄。把它拷进 `const` 常量，语义是「这里的值不会再变」，编译器才愿意继续信任。

还有一个容易被忽略的坑是可选属性。`{ items?: string[] }` 里的可选意味着「属性可能不存在，也可能存在但值不确定」，所以用 `in` 判断属性存在之后，直接读 `items.length` 仍可能不成立。我的处理方式是放弃可选属性，改成显式写清 `items: string[] | undefined`，然后用 `!= null` 判断 —— 这样分支条件写出来就自带语义，也不需要我去记 `in` 对可选属性的收窄规则。

## 什么时候断言仍然合理

把断言判成完全不必要也不客观，有两种场合我会继续用：

1. `as const` 之类不涉及类型欺骗的用法，例如把路由表固定成字面量，让取值范围收窄到具体字符串。
2. 外部数据进入系统的边界，例如解析本地存储或接口返回值。这时断言集中在少数几个校验函数里，配合运行时检查一起用。

```ts
// satisfies 既校验结构，又保留每个键的字面量类型
const routes = {
  home: "/",
  post: "/blog/[slug]",
} as const satisfies Record<string, `/${string}`>;

// routes.post 的类型是 "/blog/[slug]"，而不是宽泛的 string
type PostPath = typeof routes.post;
```

`satisfies` 的好处是校验和取值同时满足：写错路径格式编译期就报错，而类型依然是精确的字面量，拿去拼接 URL 时不会被抹成 `string`。

## 小结

类型收窄的核心不是记住一堆语法，而是保证一件事：凡是运行时才做的判断，编译器都看得见。能写 `switch` 就别写 `as`；确实需要断言时，把它包在带返回值检查的函数里，让断言的前提也被代码检查一遍。

下一步我准备把项目里所有 `as unknown as` 的用法过一遍，逐个替换成类型谓词或者 Schema 校验，看看能挖出多少被压住的问题。
