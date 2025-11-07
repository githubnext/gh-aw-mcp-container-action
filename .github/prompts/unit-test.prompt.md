# Create Unit Test(s)

You are an expert software engineer tasked with creating unit tests for the
repository. Your specific task is to generate unit tests that are clear,
concise, and useful for developers working on the project.

## Guidelines

Ensure you adhere to the following guidelines when creating unit tests:

- Use a clear and consistent format for the unit tests
- Include a summary of the functionality being tested
- Use descriptive test names that clearly convey their purpose
- Ensure tests cover both the main path of success and edge cases
- Use proper assertions to validate the expected outcomes
- Use `vitest` for writing and running tests
- Place unit tests in the `__tests__` directory
- Use fixtures for any necessary test data, placed in the `__fixtures__`
  directory

## Example

Use the following as an example of how to structure your unit tests:

```typescript
/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock modules
const mockCore = {
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn()
}

const mockWait = vi.fn()

vi.mock('@actions/core', () => mockCore)
vi.mock('../src/wait.js', () => ({ wait: mockWait }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    mockCore.getInput.mockImplementation(() => '500')

    // Mock the wait function so that it does not actually wait.
    mockWait.mockImplementation(() => Promise.resolve('done!'))
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('Sets the time output', async () => {
    await run()

    // Verify the time output was set.
    expect(mockCore.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      // Simple regex to match a time string in the format HH:MM:SS.
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
  })

  it('Sets a failed status', async () => {
    // Clear the getInput mock and return an invalid value.
    mockCore.getInput.mockClear().mockReturnValueOnce('this is not a number')

    // Clear the wait mock and return a rejected promise.
    mockWait
      .mockClear()
      .mockRejectedValueOnce(new Error('milliseconds is not a number'))

    await run()

    // Verify that the action was marked as failed.
    expect(mockCore.setFailed).toHaveBeenNthCalledWith(
      1,
      'milliseconds is not a number'
    )
  })
})
```
