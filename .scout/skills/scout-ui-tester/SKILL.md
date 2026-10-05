---
name: scout-ui-tester
description: Forces verification of responsive design, Tailwind classes, and a11y regressions.
trigger: frontend_ui
---

# Scout UI Testing Protocol

When modifying frontend UI components, you MUST verify the following before concluding:

1. **Responsiveness:** Ensure Tailwind classes for mobile (`sm:`), tablet (`md:`), and desktop (`lg:`) are considered.
2. **Accessibility (a11y):** Ensure interactive elements have `aria-labels` or readable text, and correct roles.
3. **Contrast & Theme:** Verify that UI elements follow the application's design system and don't introduce jarring off-brand colors.
