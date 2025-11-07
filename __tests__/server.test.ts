/**
 * Unit tests for server.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock dependencies
const mockRandomBytes = vi.fn()
const mockCreateServer = vi.fn()
const mockFindFreePort = vi.fn()
const mockRunDockerContainer = vi.fn()
const mockStopDockerContainer = vi.fn()
const mockSetupDebugLogging = vi.fn()

// Mock MCP SDK Client
class MockClient {
  connect = vi.fn()
  transport = {
    request: vi.fn()
  }
}

const mockStdioClientTransport = vi.fn()
const mockStreamableHTTPClientTransport = vi.fn()

// Mock MCP SDK Server
class MockServer {
  connect = vi.fn()
  setRequestHandler = vi.fn()
}

const mockStreamableHTTPServerTransport = {
  close: vi.fn(),
  handleRequest: vi.fn()
}

// Mock modules
vi.mock('node:crypto', () => ({
  randomBytes: mockRandomBytes
}))

vi.mock('node:http', () => ({
  default: {
    createServer: mockCreateServer
  }
}))

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: MockClient
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: mockStdioClientTransport
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: mockStreamableHTTPClientTransport
}))

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer
}))

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(() => mockStreamableHTTPServerTransport)
}))

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: {}
}))

vi.mock('../src/port.js', () => ({
  findFreePort: mockFindFreePort
}))

vi.mock('../src/docker.js', () => ({
  runDockerContainer: mockRunDockerContainer,
  stopDockerContainer: mockStopDockerContainer
}))

vi.mock('../src/logging.js', () => ({
  setupDebugLogging: mockSetupDebugLogging
}))

// Import the module being tested
const { startProxy } = await import('../src/server.js')

describe('server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock instances
    MockClient.prototype.connect = vi.fn().mockResolvedValue(undefined)
    MockClient.prototype.transport = {
      request: vi.fn()
    }
    MockServer.prototype.connect = vi.fn().mockResolvedValue(undefined)
    MockServer.prototype.setRequestHandler = vi.fn()

    // Setup default mocks
    mockSetupDebugLogging.mockReturnValue(vi.fn())
    mockFindFreePort.mockResolvedValue(3000)
    mockRandomBytes.mockReturnValue({
      toString: () => 'mock-hex-value'
    })

    // Mock process.on
    vi.spyOn(process, 'on').mockImplementation(() => process)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('startProxy', () => {
    it('starts HTTP proxy with stdio upstream', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        upstream: {
          type: 'stdio' as const,
          command: 'node',
          args: ['server.js']
        }
      }

      const result = await startProxy(input)

      expect(result).toHaveProperty('apiKey')
      expect(result).toHaveProperty('port')
      expect(result).toHaveProperty('url')
      expect(result.port).toBe(3000)
      expect(result.url).toBe('http://127.0.0.1:3000/mcp')
      expect(mockStdioClientTransport).toHaveBeenCalledWith({
        command: 'node',
        args: ['server.js']
      })
    })

    it('starts HTTP proxy with http upstream', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        upstream: {
          type: 'http' as const,
          url: 'http://example.com/mcp'
        }
      }

      const result = await startProxy(input)

      expect(result).toHaveProperty('apiKey')
      expect(result).toHaveProperty('port')
      expect(result).toHaveProperty('url')
      expect(mockStreamableHTTPClientTransport).toHaveBeenCalled()
    })

    it('starts docker container when containerImage is provided', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)
      mockRunDockerContainer.mockReturnValue('container-id-123')
      mockFindFreePort.mockResolvedValueOnce(5000).mockResolvedValueOnce(3000)

      // Mock setTimeout for container readiness wait
      vi.useFakeTimers()

      const input = {
        containerImage: 'my-mcp-server',
        containerVersion: 'v1.0.0'
      }

      const promise = startProxy(input)

      // Fast-forward the 3 second wait
      await vi.advanceTimersByTimeAsync(3000)

      const result = await promise

      expect(mockRunDockerContainer).toHaveBeenCalledWith(
        'my-mcp-server',
        'v1.0.0',
        5000,
        4000
      )
      expect(result.containerId).toBe('container-id-123')

      vi.useRealTimers()
    })

    it('uses custom containerPort when provided', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)
      mockRunDockerContainer.mockReturnValue('container-id-456')
      mockFindFreePort.mockResolvedValueOnce(5000).mockResolvedValueOnce(3000)

      vi.useFakeTimers()

      const input = {
        containerImage: 'my-mcp-server',
        containerVersion: 'v1.0.0',
        containerPort: 8080
      }

      const promise = startProxy(input)
      await vi.advanceTimersByTimeAsync(3000)
      await promise

      expect(mockRunDockerContainer).toHaveBeenCalledWith(
        'my-mcp-server',
        'v1.0.0',
        5000,
        8080
      )

      vi.useRealTimers()
    })

    it('throws error when no upstream is defined', async () => {
      const input = {}

      await expect(startProxy(input)).rejects.toThrow('No upstream defined')
    })

    it('throws error for invalid upstream configuration', async () => {
      const input = {
        upstream: {
          type: 'stdio' as const
          // Missing command
        }
      }

      await expect(startProxy(input)).rejects.toThrow(
        'Invalid upstream configuration'
      )
    })

    it('uses custom logDir when provided', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        logDir: '/custom/logs',
        upstream: {
          type: 'http' as const,
          url: 'http://example.com/mcp'
        }
      }

      await startProxy(input)

      expect(mockSetupDebugLogging).toHaveBeenCalledWith('/custom/logs')
    })

    it('uses custom host and port when provided in listen config', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        listen: {
          http: true,
          host: '0.0.0.0',
          port: 9999
        },
        upstream: {
          type: 'http' as const,
          url: 'http://example.com/mcp'
        }
      }

      const result = await startProxy(input)

      expect(result.url).toBe('http://0.0.0.0:9999/mcp')
      expect(result.port).toBe(9999)
      expect(mockHttpServer.listen).toHaveBeenCalledWith(
        9999,
        '0.0.0.0',
        expect.any(Function)
      )
    })

    it('registers SIGINT handler to stop container', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)
      mockRunDockerContainer.mockReturnValue('container-id-789')
      mockFindFreePort.mockResolvedValueOnce(5000).mockResolvedValueOnce(3000)

      vi.useFakeTimers()

      const input = {
        containerImage: 'my-mcp-server',
        containerVersion: 'v1.0.0'
      }

      const promise = startProxy(input)
      await vi.advanceTimersByTimeAsync(3000)
      await promise

      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function))

      vi.useRealTimers()
    })

    it('generates random API key for authentication', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        upstream: {
          type: 'http' as const,
          url: 'http://example.com/mcp'
        }
      }

      const result = await startProxy(input)

      expect(mockRandomBytes).toHaveBeenCalledWith(32)
      expect(result.apiKey).toBe('mock-hex-value')
    })

    it('does not include containerId in output when no container is started', async () => {
      const mockHttpServer = {
        listen: vi.fn((port: number, host: string, callback: () => void) => {
          callback()
        })
      }
      mockCreateServer.mockReturnValue(mockHttpServer)

      const input = {
        upstream: {
          type: 'http' as const,
          url: 'http://example.com/mcp'
        }
      }

      const result = await startProxy(input)

      expect(result.containerId).toBeUndefined()
    })
  })
})
