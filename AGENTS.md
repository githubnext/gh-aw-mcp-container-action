# Copilot Instructions

This GitHub Action is written in TypeScript and transpiled to JavaScript. Both
the TypeScript sources and the **generated** JavaScript code are contained in
this repository. The TypeScript sources are contained in the `src` directory and
the JavaScript code is contained in the `dist` directory. A GitHub Actions
workflow checks that the JavaScript code in `dist` is up-to-date. Therefore, you
should not review any changes to the contents of the `dist` folder and it is
expected that the JavaScript code in `dist` closely mirrors the TypeScript code
it is generated from.

## Repository Structure

| Path                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `__tests__/`         | Unit Tests                                               |
| `.devcontainer/`     | Development Container Configuration                      |
| `.github/`           | GitHub Configuration                                     |
| `.licenses/`         | License Information                                      |
| `.vscode/`           | Visual Studio Code Configuration                         |
| `badges/`            | Badges for readme                                        |
| `dist/`              | Generated JavaScript Code                                |
| `src/`               | TypeScript Source Code                                   |
| `.env.example`       | Environment Variables Example for `@github/local-action` |
| `.licensed.yml`      | Licensed Configuration                                   |
| `.markdown-lint.yml` | Markdown Linter Configuration                            |
| `.node-version`      | Node.js Version Configuration                            |
| `.prettierrc.yml`    | Prettier Formatter Configuration                         |
| `.yaml-lint.yml`     | YAML Linter Configuration                                |
| `action.yml`         | GitHub Action Metadata                                   |
| `CODEOWNERS`         | Code Owners File                                         |
| `eslint.config.mjs`  | ESLint Configuration                                     |
| `vitest.config.ts`   | Vitest Configuration                                     |
| `LICENSE`            | License File                                             |
| `package.json`       | NPM Package Configuration                                |
| `README.md`          | Project Documentation                                    |
| `rollup.config.ts`   | Rollup Bundler Configuration                             |
| `tsconfig.json`      | TypeScript Configuration                                 |

## Environment Setup

Install dependencies by running:

```bash
npm install
```

## Testing

Ensure all unit tests pass by running:

```bash
npm run test
```

Unit tests should exist in the `__tests__` directory. They are powered by
`vitest`.

## Bundling

Any time files in the `src` directory are changed, you should run the following
command to bundle the TypeScript code into JavaScript:

```bash
npm run bundle
```

## Logging and Tracing

This project uses the [`debug`](https://www.npmjs.com/package/debug) package for
logging and tracing. The `debug` package provides a lightweight, performant
logging solution with namespaced loggers and printf-style formatting.

### Setting Up Logging

The `src/logging.ts` file provides a `setupDebugLogging()` function that
configures the debug logging system to write logs to both the console and to log
files in the specified directory.

### Using Debug Loggers in Your Code

Each TypeScript file should create its own dedicated logger instance using a
unique namespace. The namespace should follow the pattern `mcp:<filename>` to
maintain consistency across the codebase.

**Example:**

```typescript
import debug from 'debug'

// Create a dedicated logger for this file
const log = debug('mcp:server')

// Use the logger throughout your code
log('Starting MCP proxy')
log('Connected to upstream client at %s', url)
log('Listening on port %d with host %s', port, host)
```

### Printf-Style Formatting

The `debug` package supports printf-style formatting for efficient string
interpolation. This approach is more performant than template literals because
the formatting only occurs when the debug namespace is enabled.

**Supported format specifiers:**

- `%s` - String
- `%d` - Number (both integer and float)
- `%j` - JSON (serializes objects)
- `%o` - Object (pretty-prints with indentation)
- `%%` - Literal percent sign

**Examples:**

```typescript
// String formatting
log('Processing request for user %s', username)

// Number formatting
log('Port %d is now listening', port)

// JSON formatting
log('Configuration: %j', config)

// Object formatting (for debugging complex objects)
log('Server state: %o', serverState)

// Multiple placeholders
log('Container %s started on port %d', containerId, port)
```

### Logger Naming Conventions

Use descriptive namespaces that identify the source file:

- `mcp:server` - for `src/server.ts`
- `mcp:docker` - for `src/docker.ts`
- `mcp:port` - for `src/port.ts`
- `mcp:main` - for `src/main.ts`

This naming pattern makes it easy to filter logs by component when debugging.

### Security Considerations

**CRITICAL**: Never log sensitive information such as:

- API keys, tokens, or authentication credentials
- Passwords or secrets
- Private keys or certificates
- Personally identifiable information (PII)
- Session identifiers

**Safe logging examples:**

```typescript
// ✅ SAFE: Log the existence of an API key without revealing it
log('API key configured: %s', apiKey ? 'yes' : 'no')

// ✅ SAFE: Log a masked or truncated version
log('API key (first 8 chars): %s...', apiKey?.substring(0, 8) || 'not set')

// ❌ UNSAFE: Never log the full secret
// log('API key: %s', apiKey)  // DON'T DO THIS!
```

### Adding Logging to New Code

When adding new functionality:

1. Import `debug` at the top of your file
2. Create a dedicated logger instance with a unique namespace
3. Add log statements at key execution points:
   - Function entry points
   - Before/after important operations
   - Error conditions and exceptions
   - State transitions
4. Use printf-style formatting for performance
5. Review your log statements to ensure no secrets are logged

**Example pattern:**

```typescript
import debug from 'debug'

const log = debug('mcp:myfile')

export async function myFunction(param: string): Promise<void> {
  log('myFunction called with param: %s', param)

  try {
    log('Starting important operation')
    // ... perform operation ...
    log('Operation completed successfully')
  } catch (error) {
    log(
      'Operation failed: %s',
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}
```

### Enabling Debug Output

To enable debug output when running the action locally, set the `DEBUG`
environment variable:

```bash
# Enable all mcp loggers
DEBUG=mcp:* npm run local-action

# Enable specific logger
DEBUG=mcp:server npm run local-action

# Enable multiple specific loggers
DEBUG=mcp:server,mcp:docker npm run local-action
```

## General Coding Guidelines

- Follow standard TypeScript and JavaScript coding conventions and best
  practices
- Changes should maintain consistency with existing patterns and style
- Document changes clearly and thoroughly, including updates to existing
  comments when appropriate
- Do not include basic, unnecessary comments that simply restate what the code
  is doing (focus on explaining _why_, not _what_)
- Use consistent error handling patterns throughout the codebase
- Use TypeScript's type system to ensure type safety and clarity
- Keep functions focused and manageable
- Use descriptive variable and function names that clearly convey their purpose
- Use JSDoc comments to document functions, classes, and complex logic
- After doing any refactoring, ensure to run `npm run test` to ensure that all
  tests still pass and coverage requirements are met
- When suggesting code changes, always opt for the most maintainable approach.
  Try your best to keep the code clean and follow "Don't Repeat Yourself" (DRY)
  principles
- Avoid unnecessary complexity and always consider the long-term maintainability
  of the code
- When writing unit tests, try to consider edge cases as well as the main path
  of success. This will help ensure that the code is robust and can handle
  unexpected inputs or situations
- Use the `@actions/core` package for logging over `console` to ensure
  compatibility with GitHub Actions logging features

### Versioning

GitHub Actions are versioned using branch and tag names. Please ensure the
version in the project's `package.json` is updated to reflect the changes made
in the codebase. The version should follow
[Semantic Versioning](https://semver.org/) principles.

## Pull Request Guidelines

When creating a pull request (PR), please ensure that:

- Keep changes focused and minimal (avoid large changes, or consider breaking
  them into separate, smaller PRs)
- Formatting checks pass
- Linting checks pass
- Unit tests pass and coverage requirements are met
- The action has been transpiled to JavaScript and the `dist` directory is
  up-to-date with the latest changes in the `src` directory
- If necessary, the `README.md` file is updated to reflect any changes in
  functionality or usage

The body of the PR should include:

- A summary of the changes
- A special note of any changes to dependencies
- A link to any relevant issues or discussions
- Any additional context that may be helpful for reviewers

## Code Review Guidelines

When performing a code review, please follow these guidelines:

- If there are changes that modify the functionality/usage of the action,
  validate that there are changes in the `README.md` file that document the new
  or modified functionality

## BEFORE RETURNING TO THE USER

Run this command and fix any issues before returning to the user.

```
npm run all
```

This command formats, lints, run tests. It is ESSENTIAL to run this command
BEFORE returning to the user or commiting files. Fix all issues found.
