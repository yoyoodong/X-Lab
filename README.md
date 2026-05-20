# X_Lab

X_Lab is a static dashboard for the X LAB agent team. It presents the team structure, role cards, project status, memory areas, and daily brief interface in a single-page HTML experience.

## Current Status

This is a static MVP. It is usable as a visual workspace, demo page, and manual team status board.

It is not yet a fully automated agent team system. The role data, task status, project state, memory entries, and brief content are currently embedded in `index.html`.

## Project Structure

```text
X_Lab/
├── index.html
├── README.md
├── .gitignore
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

Open `index.html` directly in a browser, or serve the folder with any static file server.

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

## Data Model Direction

Recommended next step:

1. Move embedded member/project/brief data out of `index.html`.
2. Add a structured `data.json`.
3. Keep Obsidian as the long-term memory and knowledge base.
4. Use GitHub for version control, release history, and collaboration.

Suggested responsibility split:

- Obsidian: task records, decision records, lessons learned, project knowledge
- X_Lab dashboard: visual workspace and status display
- GitHub: source control, publishing, issues, pull requests

## Next Milestones

- Extract page data into `data.json`
- Add deploy target, such as GitHub Pages or Netlify
- Add a workflow for writing daily brief and memory records back to Obsidian
- Add automation around project/task status updates

