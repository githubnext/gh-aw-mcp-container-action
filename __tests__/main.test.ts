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

  it('Sets the outputs on success with http type', async () => {
    // Setup mocks for HTTP type
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'http'
        case 'url':
          return 'http://example.com'
        case 'logs-dir':
          return './logs'
        default:
          return ''
      }
    })
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
    expect(mockCore.setOutput).toHaveBeenCalledWith('token', 'test-api-key')
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'container-id',
      'test-container-id'
    )
    expect(mockCore.setFailed).not.toHaveBeenCalled()
  })

  it('Sets the outputs on success with stdio type', async () => {
    // Setup mocks for stdio type
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'args':
          return '["server.js"]'
        case 'logs-dir':
          return './logs'
        default:
          return ''
      }
    })
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
    })

    await run()

    // Verify outputs were set
    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'url',
      'http://localhost:3000'
    )
    expect(mockCore.setOutput).toHaveBeenCalledWith('port', 3000)
    expect(mockCore.setOutput).toHaveBeenCalledWith('token', 'test-api-key')
    expect(mockCore.setFailed).not.toHaveBeenCalled()
  })

  it('Handles JSON env and headers for http type', async () => {
    // Setup mocks with JSON inputs
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'http'
        case 'url':
          return 'http://example.com'
        case 'headers':
          return '{"Authorization": "Bearer token"}'
        case 'logs-dir':
          return './logs'
        default:
          return ''
      }
    })
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
    })

    await run()

    expect(mockCore.setFailed).not.toHaveBeenCalled()
    expect(mockStartProxy).toHaveBeenCalledWith({
      logDir: './logs',
      upstream: {
        type: 'http',
        url: 'http://example.com',
        headers: { Authorization: 'Bearer token' }
      },
      containerImage: '',
      containerVersion: ''
    })
  })

  it('Handles JSON env for stdio type', async () => {
    // Setup mocks with JSON env
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'env':
          return '{"NODE_ENV": "production"}'
        case 'logs-dir':
          return './logs'
        default:
          return ''
      }
    })
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
    })

    await run()

    expect(mockCore.setFailed).not.toHaveBeenCalled()
    expect(mockStartProxy).toHaveBeenCalledWith({
      logDir: './logs',
      upstream: {
        type: 'stdio',
        command: 'node',
        env: { NODE_ENV: 'production' }
      },
      containerImage: '',
      containerVersion: ''
    })
  })

  it('Sets a failed status on error', async () => {
    // Setup mocks
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'type') return 'http'
      if (name === 'url') return 'http://example.com'
      return ''
    })
    mockStartProxy.mockRejectedValue(new Error('Connection failed'))

    await run()

    // Verify that the action was marked as failed
    expect(mockCore.setFailed).toHaveBeenCalledWith('Connection failed')
  })

  it('Does not set container-id output when not present', async () => {
    // Setup mocks
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'type') return 'http'
      if (name === 'url') return 'http://example.com'
      return ''
    })
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
    expect(mockCore.setOutput).toHaveBeenCalledWith('token', 'test-api-key')
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'container-id',
      expect.anything()
    )
  })

  it('Fails when type is stdio but command is missing', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'type') return 'stdio'
      return ''
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      "Input 'command' is required when type is 'stdio'"
    )
  })

  it('Fails when type is http but url is missing', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'type') return 'http'
      return ''
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      "Input 'url' is required when type is 'http'"
    )
  })

  it('Fails when type is invalid', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === 'type') return 'invalid'
      return ''
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      "Invalid type 'invalid'. Must be 'stdio' or 'http'"
    )
  })

  it('Fails when args input is invalid JSON', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'args':
          return 'not-valid-json'
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Invalid JSON array for input 'args'"
    )
  })

  it('Fails when args input is not an array', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'args':
          return '{"not": "an array"}'
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Input 'args' must be a JSON array, received: object"
    )
  })

  it('Fails when env input is invalid JSON', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'env':
          return 'not-valid-json'
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Invalid JSON for input 'env'"
    )
  })

  it('Fails when env input contains non-string values', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'env':
          return '{"PORT": 3000}' // number instead of string
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Input 'env' must contain only string values"
    )
  })

  it('Fails when headers input contains non-string values', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'http'
        case 'url':
          return 'http://example.com'
        case 'headers':
          return '{"Content-Length": 100}' // number instead of string
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Input 'headers' must contain only string values"
    )
  })

  it('Fails when env input is an array', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'stdio'
        case 'command':
          return 'node'
        case 'env':
          return '["not", "an", "object"]'
        default:
          return ''
      }
    })

    await run()

    expect(mockCore.setFailed).toHaveBeenCalled()
    expect(mockCore.setFailed.mock.calls[0][0]).toContain(
      "Input 'env' must be a JSON object, received: array"
    )
  })

  it('Supports container-image input', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'http'
        case 'url':
          return 'http://example.com'
        case 'container-image':
          return 'myimage:latest'
        default:
          return ''
      }
    })
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
    })

    await run()

    expect(mockStartProxy).toHaveBeenCalledWith({
      logDir: './logs',
      upstream: {
        type: 'http',
        url: 'http://example.com'
      },
      containerImage: 'myimage:latest',
      containerVersion: ''
    })
  })

  it('Supports legacy container input', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'type':
          return 'http'
        case 'url':
          return 'http://example.com'
        case 'container':
          return 'myimage:latest'
        default:
          return ''
      }
    })
    mockStartProxy.mockResolvedValue({
      url: 'http://localhost:3000',
      port: 3000,
      apiKey: 'test-api-key'
    })

    await run()

    expect(mockStartProxy).toHaveBeenCalledWith({
      logDir: './logs',
      upstream: {
        type: 'http',
        url: 'http://example.com'
      },
      containerImage: 'myimage:latest',
      containerVersion: ''
    })
  })
})
