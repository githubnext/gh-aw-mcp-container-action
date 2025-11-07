import * as core from '@actions/core'
import { startProxy } from './server.js'

/**
 * Parse JSON input or return undefined
 */
function parseJsonInput(name: string): Record<string, unknown> | undefined {
  const input = core.getInput(name)
  if (!input) return undefined
  try {
    return JSON.parse(input)
  } catch (error) {
    throw new Error(
      `Invalid JSON for input '${name}': ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Parse JSON array input or return undefined
 */
function parseJsonArrayInput(name: string): string[] | undefined {
  const input = core.getInput(name)
  if (!input) return undefined
  try {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) {
      throw new Error(
        `Input '${name}' must be a JSON array, received: ${typeof parsed}`
      )
    }
    return parsed
  } catch (error) {
    throw new Error(
      `Invalid JSON array for input '${name}': ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const type = core.getInput('type', { required: true })
    const logsDir = core.getInput('logs-dir') || './logs'

    // Parse optional JSON inputs
    const env = parseJsonInput('env') as Record<string, string> | undefined
    const headers = parseJsonInput('headers') as
      | Record<string, string>
      | undefined
    const args = parseJsonArrayInput('args')

    // Build upstream configuration based on type
    let upstreamConfig
    if (type === 'stdio') {
      const command = core.getInput('command')
      if (!command) {
        throw new Error("Input 'command' is required when type is 'stdio'")
      }
      upstreamConfig = {
        type: 'stdio' as const,
        command,
        args,
        env
      }
    } else if (type === 'http') {
      const url = core.getInput('url')
      if (!url) {
        throw new Error("Input 'url' is required when type is 'http'")
      }
      upstreamConfig = {
        type: 'http' as const,
        url,
        headers
      }
    } else {
      throw new Error(`Invalid type '${type}'. Must be 'stdio' or 'http'`)
    }

    // Handle container image (support both 'container' and 'container-image')
    const containerImage =
      core.getInput('container-image') || core.getInput('container')

    const res = await startProxy({
      logDir: logsDir,
      upstream: upstreamConfig,
      containerImage
    })

    // Set outputs
    core.setOutput('url', res.url)
    core.setOutput('port', res.port)
    core.setOutput('token', res.apiKey)

    // Legacy output for backward compatibility
    if (res.containerId) {
      core.setOutput('container-id', res.containerId)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
