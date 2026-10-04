# Pipeline Management

Scout tracks your workflow visually using a Kanban-style pipeline.

## States

1. **DISCOVERED:** Raw issues found by the Issue Scanner.
2. **ENGAGED:** Issues currently in the AI Evaluator being evaluated.
3. **CLAIMED:** Issues you have decided to work on.
4. **ASSIGNED:** Issues where you have successfully been assigned on GitHub.
5. **ABANDONED:** Issues you tried to work on but gave up.

## Automation

Scout tries to automate as much of the pipeline as possible:

- If you comment "I would like to work on this" on GitHub, Scout will automatically move the issue to **CLAIMED**.
- If a maintainer officially assigns you on GitHub, the Webhook will automatically move the issue to **ASSIGNED**.
