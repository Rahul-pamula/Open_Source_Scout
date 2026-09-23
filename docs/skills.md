# Scout Skills Specification

Scout skills allow open-source maintainers to extend Scout's analysis capabilities with custom logic tailored to their repository. A skill is defined as a Markdown file with a YAML frontmatter block that specifies its configuration and triggers. 

By adding a `.scout/skills/SKILL.md` file, you can guide Scout to perform automated actions, categorize issues, and analyze pull requests based on your project's unique requirements.

## File Format & Schema

A Scout skill file (`.scout/skills/SKILL.md`) consists of two main parts:
1. **YAML Frontmatter**: Defines the schema, metadata, dependencies, and triggers for the skill.
2. **Markdown Body**: Contains the instructional prompt or logic that Scout will execute when the skill is triggered.

### YAML Frontmatter Schema

Here is the concrete schema you can copy/paste into your own repository:

```yaml
---
name: "Skill Name"
description: "A brief description of what this skill does."
domain: "frontend | backend | devops | security | documentation | other"
dependencies:
  - "list of"
  - "required skills or tools"
triggers:
  events:
    - "pull_request.opened"
    - "issue.created"
  categories:
    - "report_analysis.bug"
    - "report_analysis.feature"
    - "report_analysis.security"
---
```

## "Hello World" Skill Example

To help you get started quickly, here is a simple "Hello World" skill. This skill instructs Scout to welcome new contributors when they open their first pull request.

Create a file at `.scout/skills/welcome_contributor.md`:

```markdown
---
name: "Welcome Contributor"
description: "Welcomes new contributors on their first PR."
domain: "documentation"
dependencies: []
triggers:
  events:
    - "pull_request.opened"
  categories: []
---

When a pull request is opened by a new contributor, leave a welcoming comment.
Include a link to the `CONTRIBUTING.md` file and thank them for their contribution.
```

## Hooking into `report_analysis` Categories

You can hook into specific analysis categories to trigger your custom skills during Scout's automated reporting. This is particularly useful for performing deeper dives on specific types of issues or code changes.

### Example: Security Analysis Hook

This skill triggers whenever Scout categorizes an issue or PR under `report_analysis.security`.

```markdown
---
name: "Deep Security Scan"
description: "Performs additional checks when security issues are detected."
domain: "security"
dependencies:
  - "semgrep"
triggers:
  events: []
  categories:
    - "report_analysis.security"
---

When triggered by a security analysis report:
1. Check the affected files for hardcoded credentials.
2. Ensure that any new API endpoints include proper authentication checks.
3. Add the `needs-security-review` label to the pull request or issue.
```

### Example: Performance Profiling Hook

This skill triggers when a pull request is categorized as affecting performance (`report_analysis.performance`).

```markdown
---
name: "Performance Check"
description: "Suggests profiling when performance-related changes are made."
domain: "backend"
dependencies: []
triggers:
  events: []
  categories:
    - "report_analysis.performance"
---

When a pull request modifies core processing logic:
1. Advise the author to run the benchmark suite using `make benchmark`.
2. Request that the benchmark results be included in the PR description.
```

By defining these hooks, you can seamlessly integrate your repository's custom standards and checks into Scout's automated workflows in just a few minutes!
