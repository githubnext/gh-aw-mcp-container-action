/**
 * Unit tests for port.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock net module
const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  address: vi.fn()
}

const mockNet = {
  createServer: vi.fn(() => mockServer)
}

vi.mock('node:net', () => ({
  default: mockNet
}))

// Import the module being tested
const { findFreePort } = await import('./port.js')

describe('port.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('findFreePort', () => {
    it('finds a free port when no preferred port is given', async () => {
      const testPort = 12345

      // Mock server.listen to call the callback immediately
      mockServer.listen.mockImplementation(
        (port: number, host: string, callback: () => void) => {
          callback()
        }
      )

      // Mock server.address to return the port
      mockServer.address.mockReturnValue({
        port: testPort,
        family: 'IPv4',
        address: '127.0.0.1'
      })

      // Mock server.close to call the callback immediately
      mockServer.close.mockImplementation((callback: () => void) => {
        callback()
      })

      const port = await findFreePort()

      expect(port).toBe(testPort)
      expect(mockNet.createServer).toHaveBeenCalled()
      expect(mockServer.listen).toHaveBeenCalledWith(
        0,
        '127.0.0.1',
        expect.any(Function)
      )
      expect(mockServer.close).toHaveBeenCalled()
    })

    it('uses preferred port when provided', async () => {
      const preferredPort = 8080

      mockServer.listen.mockImplementation(
        (port: number, host: string, callback: () => void) => {
          callback()
        }
      )

      mockServer.address.mockReturnValue({
        port: preferredPort,
        family: 'IPv4',
        address: '127.0.0.1'
      })

      mockServer.close.mockImplementation((callback: () => void) => {
        callback()
      })

      const port = await findFreePort(preferredPort)

      expect(port).toBe(preferredPort)
      expect(mockServer.listen).toHaveBeenCalledWith(
        preferredPort,
        '127.0.0.1',
        expect.any(Function)
      )
    })

    it('uses custom host when provided', async () => {
      const customHost = '0.0.0.0'
      const testPort = 9999

      mockServer.listen.mockImplementation(
        (port: number, host: string, callback: () => void) => {
          callback()
        }
      )

      mockServer.address.mockReturnValue({
        port: testPort,
        family: 'IPv4',
        address: customHost
      })

      mockServer.close.mockImplementation((callback: () => void) => {
        callback()
      })

      const port = await findFreePort(undefined, customHost)

      expect(port).toBe(testPort)
      expect(mockServer.listen).toHaveBeenCalledWith(
        0,
        customHost,
        expect.any(Function)
      )
    })

    it('rejects when server.address returns null', async () => {
      mockServer.listen.mockImplementation(
        (port: number, host: string, callback: () => void) => {
          callback()
        }
      )

      mockServer.address.mockReturnValue(null)

      await expect(findFreePort()).rejects.toThrow('Unable to get address')
    })

    it('rejects when server.address returns a string', async () => {
      mockServer.listen.mockImplementation(
        (port: number, host: string, callback: () => void) => {
          callback()
        }
      )

      mockServer.address.mockReturnValue('/tmp/socket')

      await expect(findFreePort()).rejects.toThrow('Unable to get address')
    })

    it('rejects when server emits an error', async () => {
      const testError = new Error('Port already in use')

      mockServer.listen.mockImplementation(() => {
        // Don't call callback, instead emit error
      })

      mockServer.on.mockImplementation(
        (event: string, handler: (err: Error) => void) => {
          if (event === 'error') {
            // Immediately emit the error
            setTimeout(() => handler(testError), 0)
          }
        }
      )

      await expect(findFreePort()).rejects.toThrow('Port already in use')
    })
  })
})
