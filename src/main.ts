import * as core from '@actions/core'
import { startProxy } from './server.js'

/**
 * Parse JSON input or return undefined
 */
function parseJsonInput(name: string): Record<string, unknown> | undefined {
  const input = core.getInput(name)
  if (!input) return undefined
  try {
    const parsed = JSON.parse(input)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        `Input '${name}' must be a JSON object, received: ${Array.isArray(parsed) ? 'array' : typeof parsed}`
      )
    }
    return parsed
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
 * Validate that all values in a record are strings
 */
function validateStringRecord(
  record: Record<string, unknown>,
  name: string
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') {
      throw new Error(
        `Input '${name}' must contain only string values, but key '${key}' has type ${typeof value}`
      )
    }
    result[key] = value
  }
  return result
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

    // Parse optional JSON inputs with validation
    const envObj = parseJsonInput('env')
    const env = envObj ? validateStringRecord(envObj, 'env') : undefined

    const headersObj = parseJsonInput('headers')
    const headers = headersObj
      ? validateStringRecord(headersObj, 'headers')
      : undefined

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
    const containerVersion = core.getInput('container-version')

    const res = await startProxy({
      logDir: logsDir,
      upstream: upstreamConfig,
      containerImage,
      containerVersion
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
