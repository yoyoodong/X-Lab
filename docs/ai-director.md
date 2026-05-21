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
6. 写一份汇总记录到 Obsidian。

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

Obsidian 汇总：

```text
/Users/dongdong/Documents/obsidian/虾团队记忆/02_任务记录/
```

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
