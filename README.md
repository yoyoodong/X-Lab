# X_Lab

X_Lab is a static dashboard for the X LAB agent team. It presents the team structure, role cards, project status, memory areas, and daily brief interface in a single-page HTML experience.

## Current Status

This is a structured static MVP. It is usable as a visual workspace, demo page, and manual team status board.

It is not yet a fully automated agent team system. The current state is loaded from `data.json`; role execution, Obsidian writes, and daily brief generation are still manual or future automation work.

## Project Structure

```text
X_Lab/
├── index.html
├── data.json
├── README.md
├── .gitignore
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
- Seven role images loaded from local assets
- Structured dashboard state loaded from `data.json`
- GitHub Pages setup instructions in `docs/github-pages.md`
- Obsidian sync contract in `docs/obsidian-sync.md`
- Seven-role operating workflow in `docs/agent-workflows.md`
- Practical operating manual in `docs/manual.md`
- Feishu task intake guide in `docs/feishu-task-intake.md`
- AI director guide in `docs/ai-director.md`

## Manual

Read the operating manual before using X_Lab as a real team workspace:

```text
docs/manual.md
```

Current application boundary:

- Usable: manual team dashboard, daily review, role/task state board, Obsidian memory process
- Not yet automatic: autonomous task execution, automatic brief generation, automatic Obsidian writes

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
