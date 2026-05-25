# X_Lab

X_Lab is a static dashboard for the X LAB agent team. It presents the team structure, role cards, project status, memory areas, and daily brief interface in a single-page HTML experience.

## Current Status

This is a structured static MVP with a minimum viable AI director runtime. It is usable as a visual workspace, demo page, manual team status board, and single-process agent-team prototype.

It is not yet a fully automated multi-process agent team system. The current dashboard state is loaded from `data.json`; `npm run director` can run a single-process role sequence, write role outputs, record agent state/handoffs/events, write Obsidian summaries, and write back to Feishu.

## Project Structure

```text
X_Lab/
├── index.html
├── data.json
├── README.md
├── .gitignore
├── .agents/
│   └── skills/
│       ├── andrej-karpathy-perspective/
│       ├── elon-musk-perspective/
│       ├── feynman-perspective/
│       ├── ilya-sutskever-perspective/
│       ├── munger-perspective/
│       ├── naval-perspective/
│       ├── paul-graham-perspective/
│       ├── taleb-perspective/
│       └── zhang-yiming-perspective/
├── docs/
│   ├── agent-workflows.md
│   ├── ai-director.md
│   ├── feishu-task-intake.md
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

## How To Run

Serve the folder with any static file server. The page reads `data.json`, so direct `file://` opening may be blocked by browser security rules.

Example:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

## What Works

- Overview panel
- Member stack interaction
- Member detail modal
- Project cards
- Memory section
- Daily brief section
- Management-layer advisor panel before execution
- Seven role images loaded from local assets
- Structured dashboard state loaded from `data.json`
- GitHub Pages setup instructions in `docs/github-pages.md`
- Obsidian sync contract in `docs/obsidian-sync.md`
- Seven-role operating workflow in `docs/agent-workflows.md`
- Practical operating manual in `docs/manual.md`
- Feishu task intake guide in `docs/feishu-task-intake.md`
- AI director guide in `docs/ai-director.md`
- Local advisor skills in `.agents/skills`
- Minimum runtime files: `data/agent-state.json`, `data/handoffs.json`, `data/events.json`

## Manual

Read the operating manual before using X_Lab as a real team workspace:

```text
docs/manual.md
```

Current application boundary:

- Usable: manual team dashboard, daily review, role/task state board, Obsidian memory process, single-process AI director run
- Not yet automatic: multi-terminal independent agents, dynamic worker queues, fully autonomous task execution

## Feishu Task Intake

Sync incomplete tasks assigned to the current Feishu user:

```bash
npm run sync:feishu
npm run validate:data
```

See:

```text
docs/feishu-task-intake.md
```

## AI Director

Run the minimum viable AI agent team:

```bash
npm run director
```

This requires:

```bash
export DEEPSEEK_API_KEY="your_key"
```

See:

```text
docs/ai-director.md
```

To write the latest AI output back to the related Feishu task without re-running AI:

```bash
npm run writeback:feishu
```

To keep watching Feishu tasks and run the AI team automatically:

```bash
npm run watch:feishu
```

Use the `Tasks` panel in `index.html` to review the generic task pool, handoff, role progress, outputs, and final status.

AI team outputs are also published to the Feishu Wiki space `虾调研`.

## Management Layer

X_Lab now uses a two-layer operating model:

1. Management layer: advisor skills review direction, risk, leverage, AI feasibility, and whether the task is worth executing.
2. Seven-agent execution layer: 虾老大 turns the decision into tasks for 新闻虾/侦察虾、产品虾、挑刺虾、运营虾 and other role agents.

Installed advisor skills:

- Paul Graham
- 张一鸣
- Andrej Karpathy
- Ilya Sutskever
- Elon Musk
- Charlie Munger
- Richard Feynman
- Naval Ravikant
- Nassim Nicholas Taleb

For news/source tasks, missing source evidence now becomes `needs_source` / `待溯源`; X_Lab will not treat that task as complete until 新闻虾 or 侦察虾 provides original source, time, credibility, and quotable evidence.

## Data Model

Current structured data lives in:

```text
data.json
```

It currently contains:

- summary
- members
- projects
- daily focus
- future plan
- memory sections
- hero type sets

Suggested responsibility split:

- Obsidian: task records, decision records, lessons learned, project knowledge
- X_Lab dashboard: visual workspace and status display
- GitHub: source control, publishing, issues, pull requests

## GitHub Pages

This repository is ready for GitHub Pages branch deployment.

Enable Pages with:

```text
Settings -> Pages -> Build and deployment -> Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Expected URL:

```text
https://yoyoodong.github.io/X-Lab/
```

## Next Milestones

- Split `data.json` into dedicated files if the state grows
- Add a local script to generate daily brief Markdown
- Add a local script to write task and decision records into Obsidian
- Add issue/task integration if GitHub becomes the operational task source
