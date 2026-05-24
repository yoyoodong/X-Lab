# AI 虾老大调度器说明

这一步的目标是让“虾老大”真正承担 AI 调度器。

## 它做什么

执行：

```bash
npm run director
```

系统会：

1. 读取 `data/tasks.json` 里的飞书任务。
2. 读取 Obsidian 的角色分工总表。
3. 读取 Obsidian 的角色卡。
4. 让虾老大、产品虾、挑刺虾、运营虾依次调用 AI 思考。
5. 每个角色生成自己的 Markdown 产出。
6. 记录每个角色的状态、接力信息和事件日志。
7. 写一份汇总记录到 Obsidian。
8. 自动把产出摘要回写到飞书任务评论。
9. 自动把飞书任务标记为完成。

## 为什么第一版只跑 4 个虾

最小可行闭环是：

```text
虾老大 -> 产品虾 -> 挑刺虾 -> 运营虾
```

这条链路已经覆盖：

- 判断目标
- 拆解方案
- 风险审查
- 形成简报

侦察虾、探索虾、设计虾后续再加入，避免第一版过复杂。

## 使用前准备

需要设置 DeepSeek API key：

```bash
export DEEPSEEK_API_KEY="你的 key"
```

可选设置模型：

```bash
export DEEPSEEK_MODEL="deepseek-v4-pro"
```

如果你后续想换 OpenAI，也可以设置 `OPENAI_API_KEY`。脚本会优先使用 DeepSeek。

如果没有 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`，脚本会直接停止，不会假装生成 AI 结果。

## 输出在哪里

AI 角色产出：

```text
outputs/ai/director/
outputs/ai/architect/
outputs/ai/critic/
outputs/ai/broadcaster/
```

最小 Agent Team 运行状态：

```text
data/agent-state.json    每个 Agent 当前状态、任务、等待资料、最近产出
data/handoffs.json       角色之间的接力记录
data/events.json         任务选择、角色开工、产出、冲突等事件日志
```

检查当前 Agent 运行时状态：

```bash
npm run check:agents
```

这个命令只读本地运行时文件，不调用 AI，也不回写飞书。它会列出每个 Agent 的状态，并提示超时、阻塞和需要仲裁的冲突。

Obsidian 汇总：

```text
/Users/dongdong/Documents/obsidian/虾团队记忆/02_任务记录/
```

## 最小 Agent Team 边界

当前仍然是单进程顺序调度，不是多终端并行 Agent。它已经具备最小团队骨架：

- 每个角色有独立状态。
- 每个角色有独立产出文件。
- 每次产出都会生成接力记录。
- 资料不足会被记录为 `waiting_input`。
- `working` 和 `waiting_input` 状态会带 `deadlineAt`，可用 `npm run check:agents` 检查超时。
- 推进发布和暂停/事实不足同时出现时，会记录冲突并交给虾老大仲裁。
- 如果存在待补充资料或冲突，系统只回写飞书评论，不自动完成任务；本地任务状态会变成 `needs_review`。

下一步如果要升级为多终端，只需要让每个终端监听自己的队列，并复用这些状态、接力和事件文件。

## 判断是否成功

成功时你会看到：

```text
Running 虾老大...
Running 产品虾...
Running 挑刺虾...
Running 运营虾...
Generated 4 AI role output(s).
```

并且每个角色都有一个独立 Markdown 文件。

## 只回写飞书，不重新跑 AI

如果 AI 产出已经生成，只想重新写一次飞书任务评论/状态：

```bash
npm run writeback:feishu
```

这个命令会读取最近一次 AI 产出，然后：

1. 给飞书任务添加评论。
2. 把飞书任务标记为完成。
3. 把本地 `data/tasks.json`、`data/assignments.json`、`data.json` 状态更新为 `feishu_completed`。

如果只想写评论，不想自动完成任务，可以这样执行：

```bash
X_LAB_FEISHU_COMPLETE=false npm run writeback:feishu
```
