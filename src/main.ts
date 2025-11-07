import * as core from '@actions/core'
import { startProxy } from './server.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const url: string = core.getInput('url')

    const res = await startProxy({
      logDir: './logs',
      upstream: {
        type: 'http',
        url
      }
    })

    core.setOutput('url', res.url)
    core.setOutput('port', res.port)
    core.setOutput(`api-key`, res.apiKey)
    if (res.containerId) {
      core.setOutput('container-id', res.containerId)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
