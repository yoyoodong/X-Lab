# X_Lab 使用说明书

## 1. 当前可应用状态

X_Lab 当前可以正式用于以下场景：

- 展示虾团队的 7 个角色、职责、当前任务和协作关系
- 做每日任务同步和复盘
- 做项目状态面板
- 记录团队决策、任务进展、踩坑经验和项目知识
- 作为 X LAB agent team 的前端工作台

X_Lab 当前不能直接替代自动化 agent 系统。它不会自动执行任务、自动判断优先级、自动写入 Obsidian，除非后续增加脚本或 agent 调度层。

准确定位：

```text
X_Lab = 可应用的人工协作工作台 + 结构化团队记忆入口
```

## 2. 项目入口

线上入口：

```text
https://lab-x.netlify.app
```

GitHub 仓库：

```text
https://github.com/yoyoodong/X-Lab
```

本地项目：

```text
/Users/dongdong/Documents/New project/X_Lab
```

本地运行：

```bash
cd "/Users/dongdong/Documents/New project/X_Lab"
python3 -m http.server 8765
```

然后打开：

```text
http://127.0.0.1:8765/
```

不要直接用 `file://` 作为主要使用方式，因为页面需要读取 `data.json`。

## 3. 文件结构

```text
X_Lab/
├── index.html
├── data.json
├── README.md
├── docs/
│   ├── manual.md
│   ├── agent-workflows.md
│   ├── github-pages.md
│   └── obsidian-sync.md
└── assets/
    └── roles/
        ├── architect.png
        ├── broadcaster.png
        ├── critic.png
        ├── designer.png
        ├── director.png
        ├── explorer.png
        └── scout.png
```

核心文件职责：

- `index.html`: 页面结构、样式、交互逻辑
- `data.json`: 当前团队状态、角色任务、项目状态、Brief、Memory 数据
- `docs/manual.md`: 使用说明书
- `docs/agent-workflows.md`: 7 个虾的职责和交接规则
- `docs/obsidian-sync.md`: Obsidian 记忆写入规范
- `docs/github-pages.md`: GitHub Pages 开启说明

## 4. 日常使用流程

### 4.1 每天开工前

1. 先同步飞书任务：

```bash
cd "/Users/dongdong/Documents/New project/X_Lab"
npm run sync:feishu
npm run validate:data
```

2. 打开线上页面或本地页面。
3. 看 `Overview`：
   - 当前全局状态
   - 成员进度
   - 今日要事
   - 飞书任务入口
   - 遗留问题
4. 看 `Projects`：
   - 当前项目
   - 负责人
   - 进度
   - 下一步
5. 决定今天优先推进哪一项。

### 4.2 分配任务

按照角色分配：

- 虾老大：目标、优先级、最终判断
- 侦察虾：外部资料、趋势、参考案例
- 挑刺虾：风险、漏洞、反例、测试缺口
- 探索虾：新方向、实验方案、替代路径
- 产品虾：结构、字段、流程、系统设计
- 设计虾：界面、视觉、组件、体验
- 运营虾：简报、发布文案、对外表达

每个任务必须明确：

- 输入是什么
- 输出是什么
- 谁负责
- 写入哪里
- 下一步给谁

### 4.3 更新面板

编辑 `data.json`。

常改字段：

```json
{
  "summary": {
    "agents": 7,
    "liveTasks": 21,
    "completion": 68,
    "status": "当前全局状态"
  }
}
```

成员任务在 `members` 中更新：

```json
{
  "name": "The Architect",
  "status": "Mapping structure",
  "progress": 72,
  "done": "3/5",
  "task": "Mapping structure",
  "taskDetail": "Structuring Overview, Members, Projects, Memory, and Brief.",
  "issue": "Data relationship not unified",
  "plan": "Refine page framework"
}
```

项目状态在 `projects` 中更新：

```json
{
  "name": "Memory Vault",
  "progress": 46,
  "tasks": "4 active",
  "issue": "Bot 之间共享记忆路径未完全定义",
  "next": "建立任务日志与决策记录"
}
```

改完后必须检查 JSON：

```bash
python3 -m json.tool data.json >/dev/null
```

没有输出就表示 JSON 格式有效。

### 4.4 写入 Obsidian

Obsidian vault：

```text
/Users/dongdong/Documents/obsidian/虾团队记忆
```

写入位置：

- 任务记录：`02_任务记录`
- 项目知识：`03_项目知识`
- 踩坑手册：`04_踩坑手册`
- 决策记录：`05_决策记录`

每次完成重要工作，至少写一条任务记录。

任务记录最小格式：

```markdown
# YYYY-MM-DD <任务名>

## Context

为什么做这件事。

## Actions

- 做了什么
- 改了哪些文件
- 谁负责

## Output

- 产出位置
- 验证方式

## Open Issues

- 还缺什么
- 下一步谁处理
```

### 4.5 飞书任务入口

飞书负责收任务，X_Lab 负责展示。

同步命令：

```bash
npm run sync:feishu
```

同步结果会写入：

```text
data/tasks.json
data.json
```

如果同步结果是 0 个任务，表示当前飞书里没有“分配给我”的未完成任务。

完整说明见：

```text
docs/feishu-task-intake.md
```

### 4.6 让虾团队真正产出

同步飞书任务后，执行：

```bash
npm run run:team
```

它会生成：

```text
outputs/director/
outputs/architect/
outputs/critic/
outputs/broadcaster/
```

每个文件就是对应角色交出的作业。

同时会写一份汇总记录到 Obsidian：

```text
/Users/dongdong/Documents/obsidian/虾团队记忆/02_任务记录
```

### 4.7 让虾老大做 AI 调度

如果已经配置 DeepSeek API key，可以执行：

```bash
npm run director
```

这一步和 `npm run run:team` 的区别：

```text
npm run run:team = 按模板生成产出
npm run director = 读取角色卡后调用 AI 生成产出
```

使用前需要：

```bash
export DEEPSEEK_API_KEY="你的 key"
```

完整说明见：

```text
docs/ai-director.md
```

### 4.8 回写飞书任务评论和状态

AI 产出完成后，系统会把结果写回飞书任务。

如果只想重新回写一次，不重新调用 AI，可以执行：

```bash
npm run writeback:feishu
```

这一步会做三件事：

```text
1. 给飞书任务添加一条虾团队产出评论
2. 把飞书任务标记为完成
3. 把本地状态更新为 feishu_completed
```

如果你只想添加评论，不想把任务设为完成：

```bash
X_LAB_FEISHU_COMPLETE=false npm run writeback:feishu
```

### 4.9 自动监听飞书任务

如果你想在飞书新建任务后，让虾团队自动开始处理：

```bash
npm run watch:feishu
```

这个命令要一直开着。它会每隔一段时间检查飞书有没有新任务。

如果只想测试一次：

```bash
npm run watch:feishu:once
```

在 X_Lab 页面里看任务协作进度时，点顶部的 `Tasks`。

`Tasks` 面板会显示：

```text
任务池
转交流
工作进展
产出文件
最终状态
```

## 5. 7 个虾的真实工作流

完整规则见：

```text
docs/agent-workflows.md
```

日常使用时按这个顺序：

```text
用户请求
-> 虾老大：判断目标和优先级
-> 产品虾：拆结构和流程
-> 侦察虾：补资料和参考
-> 探索虾：给替代方案
-> 设计虾：做界面和体验
-> 挑刺虾：检查风险和漏洞
-> 运营虾：整理简报和对外表达
-> Obsidian：写入任务/决策/踩坑记录
```

不是每个任务都需要 7 个角色全部参与。小任务可以只走：

```text
虾老大 -> 产品虾 -> 挑刺虾 -> 运营虾
```

## 6. 发布流程

每次改完项目后：

```bash
cd "/Users/dongdong/Documents/New project/X_Lab"
git status
python3 -m json.tool data.json >/dev/null
git add .
git commit -m "Update X_Lab state"
git push origin main
```

如果 Netlify 绑定 GitHub main 分支，推送后会自动部署到：

```text
https://lab-x.netlify.app
```

## 7. GitHub Pages

如果要启用 GitHub Pages，进入 GitHub 仓库：

```text
Settings -> Pages
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

预期地址：

```text
https://yoyoodong.github.io/X-Lab/
```

## 8. 当前限制

当前限制必须明确：

- 任务不会自动执行
- Brief 不会自动生成
- Obsidian 不会自动写入
- `data.json` 需要人工维护
- 没有权限系统
- 没有任务历史数据库
- 没有 agent 调度器

这不影响当前作为团队工作台使用，但如果要进入自动化生产状态，需要补脚本或后端。

## 9. 下一阶段建议

优先级从高到低：

1. 增加 `scripts/generate-brief`，从 `data.json` 生成每日简报 Markdown。
2. 增加 `scripts/write-obsidian-record`，把简报写入 Obsidian。
3. 把 `data.json` 拆成 `data/members.json`、`data/projects.json`、`data/tasks.json`。
4. 增加任务历史记录。
5. 接入 GitHub Issues 或飞书 Base 作为结构化任务源。

## 10. 判断标准

如果只是团队展示、人工任务同步、复盘、项目状态管理，当前版本已经可应用。

如果目标是让 7 个 agent 自动执行任务、自动协作、自动写记忆，当前版本还缺自动化层。

当前最准确的状态：

```text
可应用于人工运营的虾团队 Lab。
尚未达到自动化 agent team 系统。
```
