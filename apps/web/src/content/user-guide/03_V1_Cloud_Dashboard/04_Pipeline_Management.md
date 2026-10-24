# Pipeline Management

Scout tracks your workflow visually using a Kanban-style pipeline.

## States

1. **DISCOVERED:** Raw issues found by the Issue Scanner.
2. **ENGAGED:** Issues currently in the AI Evaluator being evaluated.
3. **CLAIMED:** Issues you have decided to work on.
4. **ASSIGNED:** Issues where you have successfully been assigned on GitHub.
5. **REVIEW:** Contributions submitted as pull requests awaiting review.
6. **COMPLETED (MERGED):** Successfully merged open-source contributions.
7. **ABANDONED:** Issues you tried to work on but gave up.

## Automation

Scout tries to automate as much of the pipeline as possible:

- If you comment "I would like to work on this" on GitHub, Scout will automatically move the issue to **CLAIMED**.
- If a maintainer officially assigns you on GitHub, the Webhook will automatically move the issue to **ASSIGNED**.
- When your pull request is merged, the contribution moves to **COMPLETED**.

## 🎯 Interview Prep Mode (Google Docs Memory)

When you make dozens of open-source contributions, human context decays quickly. Scout makes it effortless to retain and review your technical reflections:

1. **Google Docs Shortcut:** Each merged contribution card includes a direct shortcut to open Google Docs (`https://docs.google.com/`).
2. **Linked Notes:** Paste your specific Google Doc link directly into the card. Scout saves and validates the URL with optimistic feedback.
3. **One-Click Review:** Access your personalized STAR notes (Situation, Task, Action, Result), tricky questions, and architectural decisions right before technical interviews.
