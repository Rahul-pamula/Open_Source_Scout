# Open Source Scout MCP - Public Testing & Reports

Welcome to the Scout MCP public testing initiative! We are crowdsourcing testing to make sure Scout MCP works robustly across all local environments, operating systems, and diverse project setups.

## How to Test Scout MCP

We need your help! Please follow these steps to test Scout MCP in your own environment:

1. **Install and Configure:**
   Open any folder/project on your laptop in your IDE. Configure your IDE to use the latest Scout MCP server:

   ```json
   "scout": {
     "command": "npx",
     "args": ["-y", "open-source-scout-mcp@latest"]
   }
   ```

   _Make sure you restart your IDE after applying this configuration!_

2. **Give the Prompt:**
   Ask your IDE's AI assistant the following prompt:

   > "Use the scout MCP server. Call the `initialize_execution` tool to analyze this codebase and list the available skills."

3. **Capture the Results:**
   Take a screenshot of the AI's response and any output (success or failure).

4. **Submit Your Report:**
   - Create a folder in this `public-testing-reports` directory (e.g., `public-testing-reports/your-github-username`).
   - Add your screenshots and a brief `report.md` detailing your OS, IDE, and a review of what happened.
   - Submit a **Pull Request** to this repository with your report!

_Note: Any Pull Requests to this directory will NOT trigger GitHub Pages deployments, so don't worry about flooding the CI/CD pipeline!_
