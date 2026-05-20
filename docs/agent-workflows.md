# X_Lab Agent Workflows

This document defines the practical operating model for the seven X_Lab roles.

## Shared Workflow

Every role follows the same loop:

1. Receive input.
2. Produce a concrete artifact.
3. Name open issues.
4. Write or request a memory record.
5. Hand off to the next responsible role.

## Role Contracts

| Role | Chinese Name | Input | Output | Memory Target |
| --- | --- | --- | --- | --- |
| The Director | 虾老大 | Goal, constraints, project state | Direction, priority, decision | `05_决策记录` |
| The Scout | 侦察虾 | Research question, market/topic scope | References, signals, source notes | `03_项目知识` |
| The Critic | 挑刺虾 | Draft, plan, implementation | Risk list, contradictions, test gaps | `04_踩坑手册` |
| The Explorer | 探索虾 | Unclear direction, creative prompt | New angles, experiments, alternatives | `03_项目知识` |
| The Architect | 产品虾 | Scattered requirements | Structure, fields, flows, data model | `03_项目知识` |
| The Designer | 设计虾 | Product structure, audience, assets | Interface direction, visual system, UI fixes | `03_项目知识` |
| The Broadcaster | 运营虾 | Progress, result, target audience | Brief, update, publishing copy | `02_任务记录` |

## Practical Application Flow

Use this flow for real work:

```text
User request
  -> Director: clarify goal and priority
  -> Architect: define structure and data model
  -> Scout: gather references if needed
  -> Explorer: propose options if direction is unclear
  -> Designer: turn structure into usable interface
  -> Critic: review risks and missing tests
  -> Broadcaster: summarize output and write brief
  -> Obsidian: store task record / decision / lesson
```

## Minimum Viable Automation

The first usable automation layer should do three things:

1. Read `data.json`.
2. Generate a daily brief from member/project status.
3. Write a Markdown record into Obsidian.

Do not automate role behavior before the input/output contracts are stable. Without clear contracts, automation will only make inconsistent records faster.

## Dashboard Data Ownership

The dashboard should read current state from `data.json`.

Recommended future files:

```text
data.json
data/members.json
data/projects.json
data/tasks.json
data/briefs/YYYY-MM-DD.json
```

For now, one `data.json` is sufficient.

## Definition Of Done

A role task is done only when:

- The requested artifact exists.
- Its file path or link is known.
- The remaining risk is stated.
- The next owner is named.
- A task record or decision record can be written to Obsidian.

