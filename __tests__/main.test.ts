/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock modules
const mockCore = {
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn()
}

const mockStartProxy = vi.fn()

vi.mock('@actions/core', () => mockCore)
vi.mock('../src/server.js', () => ({
  startProxy: mockStartProxy
}))

// Import the module being tested
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('Sets the outputs on success', async () => {
    // Setup mocks
    mockCore.getInput.mockReturnValue('http://example.com')
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key',
      containerId: 'test-container-id'
    })

    await run()

    // Verify outputs were set
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'url',
      'http://localhost:3000'
    )
    expect(mockCore.setOutput).toHaveBeenCalledWith('port', 3000)
    expect(mockCore.setOutput).toHaveBeenCalledWith('api-key', 'test-api-key')
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'container-id',
      'test-container-id'
    )
    expect(mockCore.setFailed).not.toHaveBeenCalled()
  })

  it('Sets a failed status on error', async () => {
    // Setup mocks
    mockCore.getInput.mockReturnValue('http://example.com')
    mockStartProxy.mockRejectedValue(new Error('Connection failed'))

    await run()

    // Verify that the action was marked as failed
    expect(mockCore.setFailed).toHaveBeenCalledWith('Connection failed')
  })

  it('Does not set container-id output when not present', async () => {
    // Setup mocks
    mockCore.getInput.mockReturnValue('http://example.com')
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
      // No containerId
    })

    await run()

    // Verify container-id was not set
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'url',
      'http://localhost:3000'
    )
    expect(mockCore.setOutput).toHaveBeenCalledWith('port', 3000)
    expect(mockCore.setOutput).toHaveBeenCalledWith('api-key', 'test-api-key')
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'container-id',
      expect.anything()
    )
  })
})
