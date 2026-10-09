---
title: "不用物理引擎，把 800 个敌人跑到 1400 FPS：Godot 2D 空间哈希网格实战"
description: "类幸存者的性能特征是「同屏几百个会动的东西」。这篇拆解一个不依赖物理引擎的实现：空间哈希网格、池化数组、分摊计算，以及一个故意接受的「慢一帧」。"
date: 2026-10-09
tags: ["AI生成博客", "Godot", "性能优化", "GDScript"]
category: "游戏开发"
difficulty: "深入"
draft: false
summary:
  - "敌人完全不用物理引擎、只用裸 Node2D，是因为几百个物理体的开销不可接受；玩家是唯一保留物理体的角色，因为只有一个、成本为零"
  - "朴素的两两距离检测在 800 个敌人时是每帧 64 万次比较（每秒 3840 万次），在 GDScript 里完全不可能，必须用空间哈希网格把邻近查询降到接近 O(1)"
  - "网格格子边长取 64 像素的依据是「接近典型的检测半径」：取太大会退化成暴力遍历，取太小则字典操作本身成为瓶颈"
  - "三个最有效的优化是池化数组避免每帧分配、标记清理代替 O(n) 的数组删除、以及把分离力按 3 帧分摊给不同相位"
  - "网格故意比实际位置慢一帧，换取同一帧内所有查询结果一致；代价是所有取用者都必须做 is_instance_valid 守卫，否则会崩在已释放的节点上"
---

类幸存者游戏的性能特征和大多数动作游戏不一样：它不考验单个角色的复杂度，它考验**同屏数量**。玩家期望屏幕上同时有几百个会移动、会被打、会互相挤开的僵尸，而且帧率不能掉。

如果用常规做法——每个敌人一个物理体、靠引擎的碰撞检测处理"谁碰到谁"——几百个敌人的开销会直接吃掉整个帧预算。所以这个项目做了一个决定：**敌人完全不用物理引擎。**

这篇文章拆解这套实现，重点放在「为什么这么做」和「实测出来是多少」。

## 先看结论

在 M4 Pro 开发机上逐档增加同屏敌人数量，实测数据：

| 同屏敌人 | 平均 FPS | 帧时间 | 占 60fps 预算 | 绘制调用 | 节点数 |
| --- | --- | --- | --- | --- | --- |
| 100 | 约 1450 | 0.69 ms | 4% | 88 | 240 |
| 300 | 1463 | 0.68 ms | 4% | 92 | 240 |
| 400 | 1372 | 0.73 ms | 4% | 92 | 240 |
| 500 | 1365 | 0.73 ms | 4% | 92 | 240 |
| 600 | 1371 | 0.73 ms | 4% | 92 | 240 |
| **800** | **1401** | **0.71 ms** | **4%** | **92** | **240** |

到 800 个敌人都没测出上限——帧时间仍然只有 60fps 预算的 4%。

有两个数字值得注意：

- **绘制调用只有 92**，而不是 800。说明 Godot 4 的 2D 批处理在正常工作（同贴图的精灵被合并），渲染侧根本不是瓶颈。
- **帧时间几乎不随敌人数增长**（100 个 0.69ms，800 个 0.71ms）。这是设计目标：让成本随数量**线性**增长，而不是平方。

不过这份数据有个必须说明的前提：**这是开发机的数据。** 玩家机器的性能分布非常宽，低端笔记本可能比它慢 3~5 倍。所以下面还会讲游戏里内置的那道防线。

## 为什么不能靠物理引擎

Godot 的物理引擎很好用，问题在于**数量**。

每个物理体都有自己的变换更新、宽相位（broadphase）配对、窄相位形状检测，以及为下一帧准备的状态。这是为了通用性付的代价：支持任意形状、任意层遮罩、连续检测、物理材质。而对一个只需要「圆形互相推开」的游戏来说，绝大部分成本是浪费的。

还有一个更隐蔽的问题：**物理体的移动和你的游戏逻辑不在同一时刻结算。** 敌人"追玩家"的逻辑和物理体"实际移到哪"之间隔着一个物理步，会出现逻辑认为敌人在这里、物理认为它在那里的情况。调试这类问题非常痛苦。

所以这里的做法是：

```
Player (CharacterBody2D)          ← 唯一保留物理体的东西
  └─ 用 move_and_slide()，因为只有一个，成本为零
                                    而且以后加墙、义棺、棺材这类障碍物时能直接用

Enemy (Node2D)                    ← 裸节点，位置自己算
  ├─ 位置：global_position += velocity * delta
  ├─ 碰撞：自己写空间哈希网格查询
  └─ 被推开：自己算分离力
```

投射物同理：不用 `Area2D`，而是每帧用一次网格圆形查询，再用距离判断精确命中。

**判断标准很简单：当你只需要一个能力的一小部分，而完整实现要付很大代价时，就自己写那一小部分。**

## 朴素做法的代价

最直接的做法是每帧遍历所有敌人两两比较距离：

```gdscript
# 不要这么做
for a in enemies:
    for b in enemies:
        if a.position.distance_to(b.position) < radius:
            separate(a, b)
```

800 个敌人是 800 × 800 = **64 万次**比较；60 帧就是每秒 **3840 万次**距离计算。GDScript 是解释执行的，这个数量级没有任何可能。

而且这个开销是不可接受的**增长方式**：敌人从 400 涨到 800，成本涨 4 倍，而不是 2 倍。你不可能靠优化单次比较来救它。

## 空间哈希网格：把邻近查询降到接近 O(1)

核心思路：**把空间切成一格格，只比较同一格和相邻格的物体。**

```gdscript
const CELL_SIZE: float = 64.0

func world_to_cell(pos: Vector2) -> Vector2i:
    return Vector2i(floori(pos.x / CELL_SIZE), floori(pos.y / CELL_SIZE))
```

每帧重建一次网格：

```gdscript
func rebuild_grid() -> void:
    _compact()          # 先清掉已经释放的敌人
    _grid.clear()
    _pool_used = 0
    for e in alive:
        var cell := world_to_cell(e.global_position)
        var bucket: Array
        if _grid.has(cell):
            bucket = _grid[cell]
        else:
            bucket = _get_pooled_array()
            _grid[cell] = bucket
        bucket.append(e)
```

查询一个圆内的敌人时，只遍历覆盖这个圆的格子：

```gdscript
func query_circle(center: Vector2, radius: float, out: Array) -> void:
    # 只遍历圆形覆盖到的格子，而不是全场所有敌人
    var min_cell := world_to_cell(center - Vector2(radius, radius))
    var max_cell := world_to_cell(center + Vector2(radius, radius))
    for cy in range(min_cell.y, max_cell.y + 1):
        for cx in range(min_cell.x, max_cell.x + 1):
            var bucket = _grid.get(Vector2i(cx, cy))
            if bucket == null:
                continue
            for e in bucket:
                if e.global_position.distance_squared_to(center) <= radius * radius:
                    out.append(e)
```

几个容易忽略但很关键的细节：

- **用 `distance_squared_to` 而不是 `distance_to`。** 开平方是纯浪费，比较距离平方就够了。
- **`alive` 用裸 `Array` 而不是节点分组查询。** `get_nodes_in_group()` 每次调用都分配一个新数组，每帧几百次分配会给垃圾回收很大压力。
- **重建网格放在 autoload 的 `_physics_process` 里。** Autoload 的 `_physics_process` 在主场景节点之前执行，于是顺序是：重建网格 → 敌人移动 → 武器查询。

### 格子边长怎么选

`CELL_SIZE = 64.0` 不是随便取的，它有一个明确的依据：**接近典型的检测半径。**

这个项目里用到的检测半径大多在 16~64 像素之间（分离力是 13、近战判定十几、光环是 70）。取值的影响：

- **取太大**：每个格子里挤满了敌人，遍历格子退化成遍历全场，网格就白做了。
- **取太小**：格子数量爆炸，字典的哈希查找本身成为瓶颈；而且查询一个圆要遍历非常多的空格子。

经验法则：**格子边长取「你最常查询的半径」这个量级。** 如果你有多种差别很大的查询半径，那说明你可能需要两套网格——但先别急着加，测了再说。

## 三个真正省下时间的优化

### 一、池化数组，避免每帧分配

上面的 `rebuild_grid` 里有一句 `_get_pooled_array()`。每帧为每个格子新建一个 `Array` 会产生大量短命对象，而 GDScript 的分配和释放都有成本。

做法是预先准备好一批空数组反复用：

```gdscript
var _cell_pool: Array = []
var _pool_used: int = 0

func _get_pooled_array() -> Array:
    if _pool_used < _cell_pool.size():
        var arr: Array = _cell_pool[_pool_used]
        _pool_used += 1
        arr.clear()
        return arr
    var fresh: Array = []
    _cell_pool.append(fresh)
    _pool_used += 1
    return fresh
```

每帧开始把 `_pool_used` 归零，等于「这一帧的格子数组全部失效、可以重用」。这是个很通用的手法：**只要某个对象的生命周期是「一帧内用完就丢」，它就该被池化。**

### 二、标记清理，而不是立刻删除

敌人在战斗中每秒死几十个。直觉写法是死的时候从存活数组里删掉：

```gdscript
# 不要这么做
alive.erase(enemy)          # O(n)，每次都要移动后面所有元素
```

每帧几十次 O(n) 操作，n 还是几百到几千，累积起来很可观。

正确做法是「标记 + 批量清理」：死掉的敌人自己 `queue_free()`，每帧统一扫一遍把无效引用挤出去：

```gdscript
func _compact() -> void:
    var write_index := 0
    var count := alive.size()
    for i in count:
        var e = alive[i]
        if e != null and is_instance_valid(e) and not e.is_queued_for_deletion():
            alive[write_index] = e
            write_index += 1
    if write_index != count:
        alive.resize(write_index)
```

这是「一次遍历完成压缩」，总成本 O(n)，但**每帧只做一次**，而不是每次删除都做一次。

### 三、分摊计算：把能省的工作摊到不同帧

分离力（几百只僵尸互相推开，否则它们会精确重叠成一个小黑点）是敌人 AI 里最贵的部分：每个敌人都要查一次邻居。

优化手法很朴素：**不是每个敌人都每帧算。**

```gdscript
# 出生时分配一个 0/1/2 的相位
func _ready() -> void:
    _sep_phase = randi() % 3

# 每帧只有三分之一的敌人在算
if Engine.get_physics_frames() % 3 == _sep_phase:
    _compute_separation()
```

这样计算量直接降到三分之一，而视觉上完全看不出来——因为分离力是"推开一点"这种容错很高的东西，延迟两三帧更新没有影响。

**这类优化的适用条件**：这个量必须满足「晚几帧更新也看不出来」。伤害判定就不满足，所以武器的命中检测仍然是每帧做的。

## 一个故意接受的代价：网格慢一帧

这是整套设计里最需要解释清楚的一点。

因为网格的构建在敌人移动**之前**，所有查询看到的都是**上一帧的敌人位置**。

```
第 N 帧的顺序：
  1. EnemyManager 重建网格     ← 用的是第 N-1 帧末的位置
  2. 敌人按自己的逻辑移动
  3. 武器查询网格打人          ← 读到的是第 N-1 帧的位置
```

这换来的是**同一帧内所有查询结果一致**。如果不这么做——比如让每次查询都实时构建——那么同一帧里武器先查一次、投射物再查一次，可能得到不同结果，出现"这一箭明明该命中却没中"这种灵异现象。

一帧的位置误差（60fps 下约 16 毫秒，敌人走 24 像素/秒，误差 0.4 像素）在这个游戏里完全不可感知。

**但代价必须付清：所有取用者都要做有效性检查。**

```gdscript
for candidate in _query_buffer:
    if candidate == null or not is_instance_valid(candidate):
        continue
    # 网格可能比实际慢一帧，里面可能还有已经释放的节点
    var enemy: Node2D = candidate
```

少了这个检查，就会崩在"读一个已经不存在的对象"上。这不是理论风险——这个项目里真的踩到过，而且报错信息指向的是读取属性那一行，看起来像是数据问题，实际是生命周期问题。

## 让判定符合视觉直觉：从贴图推导碰撞半径

一个手感问题：如果投射物只用自己 6 像素的判定半径去撞敌人的**中心点**，玩家看到的是"剑穿过去了却没打中"。

修法是给每个敌人一个身体半径，判定时把两者相加：

```gdscript
var combined := hit_radius + enemy_body_radius
if distance <= combined:
    hit()
```

而这个身体半径不是手配的，是从贴图推导的：

```gdscript
var half_width := PixelArt.get_pivot(stats.sprite_id).x * stats.scale_mult
body_radius = maxf(2.5, half_width * 0.7)
```

**从已有数据推导，能减少需要维护的字段数量**，也让"改了贴图尺寸之后判定自动跟着变"成为默认行为——否则迟早会出现"图改了判定没改"这种极难发现的问题。

## 还没解决的问题：低端机

上面那份 800 敌人的数据来自开发机。玩家机器的性能分布很宽，**低端笔记本可能慢 3~5 倍**。所以 `max_enemies = 420` 这个上限在低端机上极有可能跑不动。

而这个上限最初是**拍脑袋定的**——只是"感觉 400 多个应该差不多"，背后没有任何测量数据。这种数字很危险：

- 定低了，游戏后期压力上不去，玩起来无聊
- 定高了，帧率在**尸潮最壮观的那一刻**崩掉——那正是玩家最可能截图分享、也最可能给差评的时刻

所以做了两件事：

**一、把测量做成工具。** 逐档增加同屏敌人数，每档预热 90 帧再测量 240 帧，记录平均帧率、p95 帧率、最差帧率、帧时间、绘制调用、节点数。用的是实际帧间隔，而不是那个自相矛盾的 `Performance.TIME_PROCESS` 监视器（它曾经给出过"800 FPS 下脚本耗时 42.9 毫秒"这种不可能的数字）。

**二、内置自适应上限。** 帧率掉下来时自动减少同屏敌人数：

```gdscript
static func decide_cap(fps, current_cap, good_samples, hard_max, min_cap) -> Dictionary:
    if fps < LOW_FPS_THRESHOLD and cap > min_cap:
        cap = maxi(cap - ADAPT_STEP, min_cap)   # 掉帧：立刻降档，不给第二次机会
        good = 0
    elif fps > HIGH_FPS_THRESHOLD and cap < hard_max:
        good += 1                                # 帧率良好：要连续几次才升档
        if good >= GOOD_SAMPLES_REQUIRED:
            cap = mini(cap + ADAPT_STEP, hard_max)
            good = 0
    return {"cap": cap, "good_samples": good}
```

两个设计细节值得说：

- **掉帧立刻降档，升档要连续三次良好。** 单次采样可能因为加载资源、垃圾回收偶然偏高；只凭一次就升档，上限会在两档之间来回横跳。
- **这是一个纯静态函数。** 把它抽出来的理由是可测试性：这样"自适应逻辑"可以被自动化测试**直接验证**，而不用去伪造 `Engine.get_frames_per_second()` 的返回值——那种为了测试给生产代码开的后门，很容易在后续改动里被误用。

**一个可以纯函数化的算法，就应该纯函数化。** 这几乎总能换来可测试性。

## 可迁移的几条原则

把上面所有东西压成能用在别的项目上的形式：

1. **只在需要的能力上付代价。** 你需要圆形推开，就别引入支持任意形状的物理引擎。
2. **让成本随数量线性增长。** 任何 O(n²) 的两两检测，都要用空间划分降下来。数量翻倍时，成本应该也翻倍。
3. **一帧内用完就丢的对象要池化。** 分配和释放比你想的贵。
4. **批量清理代替立刻删除。** 高频删除场景下，O(n) 的单次删除会累积成瓶颈。
5. **容错高的量可以分摊到多帧。** 分离力、装饰物刷新、寻路重算都可以；伤害判定不行。
6. **一致性优先于精确性。** 故意让数据慢一帧，换来同一帧内所有取用者看到同一个世界——但记得把所有取用者都加上有效性检查。
7. **别猜上限，去测。** 而且要记住：**开发机的数字不是玩家机器的数字**，测完之后要留出一大截余量，最好再配一个运行时自适应机制兜底。

最后一条是这个项目里最贵的一课：`max_enemies = 420` 这个数字猜了几个月才被真正测过，而测试工具本身又花了更久才建起来。**如果你在为一个数字做取舍，而它没有任何测量支撑，那它就是一个还没暴露的 bug。**
