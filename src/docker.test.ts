/**
 * Unit tests for docker.ts
 */
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

// Mock child_process module
const mockSpawnSync = vi.fn()

vi.mock('child_process', () => ({
  spawnSync: mockSpawnSync
}))

// Import the module being tested
const { runDockerContainer, stopDockerContainer } = await import('./docker.js')

describe('docker.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('runDockerContainer', () => {
    it('successfully runs a docker container and returns container ID', () => {
      const mockContainerId = 'abc123def456'
      const image = 'my-image'
      const version = 'v1.0.0'
      const hostPort = 8080
      const containerPort = 3000

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: `${mockContainerId}\n`,
        stderr: ''
      })

      const containerId = runDockerContainer(
        image,
        version,
        hostPort,
        containerPort
      )

      expect(containerId).toBe(mockContainerId)
      expect(mockSpawnSync).toHaveBeenCalledWith(
        'docker',
        [
          'run',
          '-d',
          '--rm',
          '-p',
          `${hostPort}:${containerPort}`,
          `${image}:${version}`
        ],
        { encoding: 'utf8' }
      )
    })

    it('trims whitespace from container ID', () => {
      const mockContainerId = 'container-id-with-spaces'
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: `  ${mockContainerId}  \n\n`,
        stderr: ''
      })

      const containerId = runDockerContainer('image', '1.0', 3000, 4000)

      expect(containerId).toBe(mockContainerId)
    })

    it('throws error when docker command fails', () => {
      const errorMessage = 'docker: Error response from daemon'
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: errorMessage
      })

      expect(() => {
        runDockerContainer('image', '1.0', 3000, 4000)
      }).toThrow(`docker run failed: ${errorMessage}`)
    })

    it('throws error when docker command returns non-zero status', () => {
      mockSpawnSync.mockReturnValue({
        status: 125,
        stdout: '',
        stderr: 'Container creation failed'
      })

      expect(() => {
        runDockerContainer('image', '1.0', 3000, 4000)
      }).toThrow('docker run failed: Container creation failed')
    })

    it('constructs correct docker run command with proper arguments', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'container-id',
        stderr: ''
      })

      runDockerContainer('test-image', 'latest', 9000, 5000)

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'docker',
        ['run', '-d', '--rm', '-p', '9000:5000', 'test-image:latest'],
        { encoding: 'utf8' }
      )
    })
  })

  describe('stopDockerContainer', () => {
    it('calls docker stop with the container ID', () => {
      const containerId = 'container-to-stop'

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: '',
        stderr: ''
      })

      stopDockerContainer(containerId)

      expect(mockSpawnSync).toHaveBeenCalledWith('docker', [
        'stop',
        containerId
      ])
    })

    it('does not throw even if docker stop fails', () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'Container not found'
      })

      // Should not throw
      expect(() => {
        stopDockerContainer('nonexistent-container')
      }).not.toThrow()
    })

    it('handles stopping multiple containers in sequence', () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: '',
        stderr: ''
      })

      stopDockerContainer('container1')
      stopDockerContainer('container2')
      stopDockerContainer('container3')

      expect(mockSpawnSync).toHaveBeenCalledTimes(3)
      expect(mockSpawnSync).toHaveBeenNthCalledWith(1, 'docker', [
        'stop',
        'container1'
      ])
      expect(mockSpawnSync).toHaveBeenNthCalledWith(2, 'docker', [
        'stop',
        'container2'
      ])
      expect(mockSpawnSync).toHaveBeenNthCalledWith(3, 'docker', [
        'stop',
        'container3'
      ])
    })
  })
})
