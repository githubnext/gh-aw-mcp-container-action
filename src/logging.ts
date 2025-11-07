import fs from 'node:fs'
import path from 'node:path'
import debug from 'debug'

export function setupDebugLogging(logDir: string): debug.Debugger {
  fs.mkdirSync(logDir, { recursive: true })
  const logfile = path.join(logDir, `mcp-proxy-${Date.now()}.log`)
  const stream = fs.createWriteStream(logfile, { flags: 'a' })
  const log = debug('mcp')
  const origLog = debug.log
  debug.log = (...args: unknown[]) => {
    const line = args.join(' ') + '\n'
    origLog?.(...args)
    stream.write(line)
  }
  log(`Logging to ${logfile}`)
  return log
}
