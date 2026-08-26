# Understanding AI Evaluations

The **Dossier** is the most powerful feature in Open Source Scout. When you click "Evaluate" on an issue, Scout sends the issue description and the recent comment history to an advanced AI model.

Here is how to interpret the results:

## 1. Difficulty Score

The AI assigns a difficulty score (e.g., `Beginner`, `Intermediate`, `Advanced`). It calculates this by looking at:
- The length and complexity of the issue description.
- Whether the issue requires deep architectural knowledge.
- If it's a simple CSS fix vs. a complex state management bug.

## 2. Skill Match

The AI compares the issue requirements against the skills you listed in your **Identity** profile.
It will tell you exactly which skills overlap and warn you if the issue requires a framework you haven't listed.

## 3. Hidden Claim Detection

One of the biggest frustrations in open source is reading an entire issue thread only to realize someone claimed it at the very bottom.

Scout's AI reads the comment thread for you. If it detects phrases like "I would like to work on this!" or "Assigned to @username", it will flag the issue as **Claimed** so you don't waste your time.
