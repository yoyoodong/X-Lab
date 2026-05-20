# Obsidian Sync Contract

This document defines how X_Lab should use Obsidian as a lightweight memory layer.

## Vault Target

Default vault path:

```text
/Users/dongdong/Documents/obsidian/虾团队记忆
```

Default folders:

```text
00_团队总则/
01_角色卡/
02_任务记录/
03_项目知识/
04_踩坑手册/
05_决策记录/
06_模板/
```

## Responsibility Split

X_Lab should not treat Obsidian as a high-frequency database. Obsidian is the human-readable memory layer.

- `data.json`: current structured dashboard state
- Obsidian Markdown: durable records, decisions, lessons, and project knowledge
- GitHub: source history, release history, issue tracking, and deployment

## Write Rules

All automated writes should follow these rules:

1. Write append-only records by default.
2. Never overwrite existing notes unless the caller explicitly names the target file and intent.
3. Use ISO dates in filenames.
4. Put operational records under `02_任务记录`.
5. Put decisions under `05_决策记录`.
6. Put reusable failures and fixes under `04_踩坑手册`.
7. Put project background and architecture notes under `03_项目知识`.

## Task Record Template

```markdown
# YYYY-MM-DD Task Record - <Project or Topic>

## Context

What triggered the work.

## Inputs

- Source files:
- User request:
- Relevant links:

## Actions

- What changed
- Who or which agent role owned it
- Files produced or updated

## Output

- Result:
- Location:
- Validation:

## Open Issues

- Remaining gap:
- Owner:
- Next action:

## Memory Tags

- #x-lab
- #task-record
```

## Decision Record Template

```markdown
# YYYY-MM-DD Decision - <Decision Name>

## Decision

The decision in one sentence.

## Reasoning

Why this was chosen.

## Alternatives Considered

- Alternative:
- Tradeoff:

## Impact

- Affected files:
- Affected workflow:
- Follow-up:

## Owner

Decision owner.
```

## Future Automation Interface

A future sync script can implement this minimal interface:

```text
obsidian-sync write-task --title "<title>" --body "<markdown>"
obsidian-sync write-decision --title "<title>" --body "<markdown>"
obsidian-sync write-lesson --title "<title>" --body "<markdown>"
```

The dashboard should only display summaries. Obsidian remains the source for detailed historical memory.

