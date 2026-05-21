# 飞书任务入口接入说明

这份文档给没有编程基础的人使用。

## 1. 这一步解决什么问题

以前：

```text
任务在飞书里，X_Lab 面板不知道。
```

现在：

```text
飞书任务 -> 同步脚本 -> data.json -> X_Lab 面板
```

也就是说，飞书负责收任务，X_Lab 负责展示任务状态。

## 2. 当前已经接通什么

已经完成：

- 可以读取“分配给我的未完成飞书任务”
- 可以生成 `data/tasks.json`
- 可以更新 `data.json`
- X_Lab 的 Overview 会显示“飞书任务入口”

当前还没有做：

- 自动定时同步
- 自动改飞书任务状态
- 自动把任务分配给 7 个虾
- 自动写入 Obsidian

这是刻意设计的。第一步先做只读同步，风险最低。

## 3. 使用前提

本机需要有：

```text
lark-cli
node
```

当前机器已经有。

飞书账号需要登录过 `lark-cli`，并且有任务读取权限：

```text
task:task:read
```

## 4. 怎么同步飞书任务

进入项目目录：

```bash
cd "/Users/dongdong/Documents/New project/X_Lab"
```

执行：

```bash
npm run sync:feishu
```

成功后会看到类似：

```text
Synced 0 Feishu task(s).
Updated data.json and data/tasks.json.
```

如果飞书里有未完成任务，就会显示同步到几个任务。

## 5. 同步后检查

检查数据格式：

```bash
npm run validate:data
```

成功时会显示：

```text
X_Lab data validation passed.
```

## 6. 同步后的文件变化

同步会改两个文件：

```text
data.json
data/tasks.json
```

`data/tasks.json` 是飞书任务列表。

`data.json` 是 X_Lab 页面读取的数据。

## 7. 发布到线上

同步并验证后，提交并推送：

```bash
git add data.json data/tasks.json
git commit -m "Sync Feishu tasks"
git push origin main
```

如果 Netlify 绑定了 GitHub main 分支，线上页面会自动更新：

```text
https://lab-x.netlify.app
```

## 8. 常见问题

### 问题：同步结果是 0 个任务

含义：飞书里当前没有“分配给我”的未完成任务。

可以先在飞书里新建一个任务，并分配给自己，再运行：

```bash
npm run sync:feishu
```

### 问题：提示权限不足

需要重新授权飞书任务读取权限：

```bash
lark-cli auth login --scope "task:task:read"
```

### 问题：页面直接打开 file:// 不更新

不要用 `file://` 作为主要使用方式。因为页面要读取 `data.json`。

使用本地服务：

```bash
python3 -m http.server 8765
```

然后打开：

```text
http://127.0.0.1:8765/
```

## 9. 下一步

下一步可以做：

1. 把飞书任务自动分配给 7 个虾。
2. 生成每日 Brief。
3. 把 Brief 写入 Obsidian。
4. 完成任务后自动回写飞书评论。

