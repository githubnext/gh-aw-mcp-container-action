/**
 * Unit tests for logging.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock dependencies
const mockMkdirSync = vi.fn()
const mockCreateWriteStream = vi.fn()
const mockDebug = vi.fn()
const mockStream = {
  write: vi.fn()
}

vi.mock('node:fs', () => ({
  default: {
    mkdirSync: mockMkdirSync,
    createWriteStream: mockCreateWriteStream
  }
}))

vi.mock('node:path', () => ({
  default: {
    join: (...args: string[]) => args.join('/')
  }
}))

vi.mock('debug', () => ({
  default: vi.fn(() => mockDebug)
}))

// Import the module being tested
const { setupDebugLogging } = await import('./logging.js')
const debug = await import('debug')

describe('logging.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateWriteStream.mockReturnValue(mockStream)
    // Reset debug.log
    ;(debug.default as unknown as { log?: (...args: unknown[]) => void }).log =
      undefined
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('setupDebugLogging', () => {
    it('creates log directory if it does not exist', () => {
      const logDir = '/tmp/test-logs'

      setupDebugLogging(logDir)

      expect(mockMkdirSync).toHaveBeenCalledWith(logDir, { recursive: true })
    })

    it('creates a write stream to log file with timestamp', () => {
      const logDir = '/tmp/logs'
      const originalDateNow = Date.now
      const mockTimestamp = 1234567890

      // Mock Date.now to return a consistent timestamp
      Date.now = vi.fn(() => mockTimestamp)

      setupDebugLogging(logDir)

      expect(mockCreateWriteStream).toHaveBeenCalledWith(
        `/tmp/logs/mcp-proxy-${mockTimestamp}.log`,
        { flags: 'a' }
      )

      // Restore Date.now
      Date.now = originalDateNow
    })

    it('returns a debug logger function', () => {
      const logDir = '/tmp/logs'

      const log = setupDebugLogging(logDir)

      expect(log).toBe(mockDebug)
      expect(debug.default).toHaveBeenCalledWith('mcp')
    })

    it('writes debug logs to both console and file', () => {
      const logDir = '/tmp/logs'
      const originalLog = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(debug.default as any).log = originalLog

      setupDebugLogging(logDir)

      // Get the new debug.log function that was set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newDebugLog = (debug.default as any).log

      // Call the new debug.log function
      newDebugLog('test message', 'with args')

      expect(originalLog).toHaveBeenCalledWith('test message', 'with args')
      expect(mockStream.write).toHaveBeenCalledWith('test message with args\n')
    })

    it('logs initial message about log file location', () => {
      const logDir = '/custom/log/dir'
      const originalDateNow = Date.now
      const mockTimestamp = 9876543210

      Date.now = vi.fn(() => mockTimestamp)

      setupDebugLogging(logDir)

      expect(mockDebug).toHaveBeenCalledWith(
        `Logging to /custom/log/dir/mcp-proxy-${mockTimestamp}.log`
      )

      Date.now = originalDateNow
    })

    it('handles multiple log entries correctly', () => {
      const logDir = '/tmp/logs'
      const originalLog = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(debug.default as any).log = originalLog

      setupDebugLogging(logDir)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newDebugLog = (debug.default as any).log

      newDebugLog('first', 'message')
      newDebugLog('second', 'message')
      newDebugLog('third')

      expect(mockStream.write).toHaveBeenCalledTimes(3)
      expect(mockStream.write).toHaveBeenNthCalledWith(1, 'first message\n')
      expect(mockStream.write).toHaveBeenNthCalledWith(2, 'second message\n')
      expect(mockStream.write).toHaveBeenNthCalledWith(3, 'third\n')
    })

    it('handles case when original debug.log is undefined', () => {
      const logDir = '/tmp/logs'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(debug.default as any).log = undefined

      setupDebugLogging(logDir)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newDebugLog = (debug.default as any).log

      // Should not throw when calling debug.log
      expect(() => {
        newDebugLog('test message')
      }).not.toThrow()

      expect(mockStream.write).toHaveBeenCalledWith('test message\n')
    })
  })
})
