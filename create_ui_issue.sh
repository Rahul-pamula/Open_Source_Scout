#!/bin/bash
gh issue create --title "[UI/UX] Redesign Landing Page Hero to Split Layout with Organic Masking" --body "### Problem
The current landing page hero section uses a centered, single-column text layout. It feels a bit plain and lacks visual dynamic range. We need to modernize it to a split two-column layout that highlights key actions and features a realistic, organically-shaped image, similar to modern SaaS landing pages.

### Acceptance Criteria
1. **Split Layout:** Refactor the hero section in \`Landing.tsx\` to use a two-column grid (\`grid md:grid-cols-2\`).
2. **Highlighted Typography:** On the left side, apply a block-highlight effect to key words in the headline (e.g., colored text with a light colored background block).
3. **Distinct CTAs:** Add two distinct call-to-action buttons below the text: one for the v1 Dashboard (primary color) and one for v2 Setup (dark color).
4. **Realistic Imagery:** Generate and integrate a high-quality, realistic image of software developers collaborating for the right column.
5. **Organic Masking:** Apply a custom CSS \`border-radius\` (blob shape) or \`clip-path\` to the right-side image so it isn't just a standard rectangle.
"
