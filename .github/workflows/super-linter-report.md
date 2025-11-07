---
on:
  workflow_dispatch:
  schedule:
    - cron: "0 14 * * 1-5" # 2 PM UTC, weekdays only
permissions:
  contents: read
  actions: read
safe-outputs:
  create-issue:
    title-prefix: "[linter] "
    labels: [automation, code-quality]
engine: copilot
name: Super Linter Report
timeout_minutes: 15
steps:
  - name: Checkout Code
    uses: actions/checkout@v5
    with:
      fetch-depth: 0
  
  - name: Setup Node.js
    uses: actions/setup-node@v6
    with:
      node-version-file: .node-version
      cache: npm
  
  - name: Install Dependencies
    run: npm ci
  
  - name: Run Super Linter
    id: super-linter
    continue-on-error: true
    uses: super-linter/super-linter/slim@v8
    env:
      CHECKOV_FILE_NAME: .checkov.yml
      DEFAULT_BRANCH: main
      FILTER_REGEX_EXCLUDE: dist/**/*
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      LINTER_RULES_PATH: .
      VALIDATE_ALL_CODEBASE: true
      # Disable linters that are covered by other workflows or not applicable
      VALIDATE_BIOME_FORMAT: false  # Prettier is used instead
      VALIDATE_BIOME_LINT: false    # ESLint is used instead
      VALIDATE_GITHUB_ACTIONS_ZIZMOR: false  # Separate security workflow
      VALIDATE_JAVASCRIPT_ES: false  # ESLint handles JS/TS linting
      VALIDATE_JSCPD: false          # Copy-paste detection not required
      VALIDATE_TYPESCRIPT_ES: false  # ESLint handles TypeScript
      VALIDATE_JSON: false           # Not strictly enforced in this project
      LOG_FILE: super-linter.log
      CREATE_LOG_FILE: true
  
  - name: Save Linter Output
    if: always()
    run: |
      if [ -f "super-linter.log" ]; then
        cp super-linter.log /tmp/linter-output.txt
      else
        echo "No super-linter.log file found" > /tmp/linter-output.txt
      fi
      
      # Also capture GitHub step summary if available
      if [ -n "$GITHUB_STEP_SUMMARY" ]; then
        echo "" >> /tmp/linter-output.txt
        echo "---" >> /tmp/linter-output.txt
        cat "$GITHUB_STEP_SUMMARY" >> /tmp/linter-output.txt 2>/dev/null || true
      fi
tools:
  bash:
    - 'cat /tmp/linter-output.txt'
  edit:
---

# Super Linter Analysis Report

You are an expert code quality analyst. Your task is to analyze the super-linter output and create a comprehensive issue report.

## Context

- **Repository**: ${{ github.repository }}
- **Triggered by**: @${{ github.actor }}
- **Run ID**: ${{ github.run_id }}

## Your Task

1. **Read the linter output** from `/tmp/linter-output.txt` using the bash tool
2. **Analyze the findings**:
   - Categorize errors by severity (critical, high, medium, low)
   - Group errors by file or linter type
   - Identify patterns in the errors
   - Determine which errors are most important to fix first
3. **Create a detailed issue** with the following structure:

### Issue Title
Use format: "Code Quality Report - [Date] - [X] issues found"

### Issue Body Structure

```markdown
## 🔍 Super Linter Analysis Summary

**Date**: [Current date]
**Total Issues Found**: [Number]
**Run ID**: ${{ github.run_id }}

## 📊 Breakdown by Severity

- **Critical**: [Count and brief description]
- **High**: [Count and brief description]  
- **Medium**: [Count and brief description]
- **Low**: [Count and brief description]

## 📁 Issues by Category

### [Category/Linter Name]
- **File**: `path/to/file`
  - Line [X]: [Error description]
  - Impact: [Why this matters]
  - Suggested fix: [How to resolve]

[Repeat for other categories]

## 🎯 Priority Recommendations

1. [Most critical issue to address first]
2. [Second priority]
3. [Third priority]

## 📋 Full Linter Output

<details>
<summary>Click to expand complete linter log</summary>

```
[Include the full linter output here]
```

</details>

## 🔗 References

- [Link to workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
- [Super Linter Documentation](https://github.com/super-linter/super-linter)
```

## Important Guidelines

- **Be concise but thorough**: Focus on actionable insights
- **Prioritize issues**: Not all linting errors are equal
- **Provide context**: Explain why each type of error matters
- **Suggest fixes**: Give practical recommendations
- **Use proper formatting**: Make the issue easy to read and navigate
- **If no errors found**: Create a positive report celebrating clean code

## Security Note

Treat linter output as potentially sensitive. Do not expose credentials, API keys, or other secrets that might appear in file paths or error messages.
