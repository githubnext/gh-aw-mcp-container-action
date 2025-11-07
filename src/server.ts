import { randomBytes } from 'node:crypto'
import http from 'node:http'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { findFreePort } from './port.js'
import { runDockerContainer, stopDockerContainer } from './docker.js'
import { setupDebugLogging } from './logging.js'

interface UpstreamConfig {
  type: 'stdio' | 'http'
  command?: string
  args?: string[]
  url?: string
}

interface ListenConfig {
  http?: boolean
  stdio?: boolean
  host?: string
  port?: number
}

interface ActionInput {
  upstream?: UpstreamConfig
  listen?: ListenConfig
  logDir: string
  containerImage?: string
  containerVersion?: string
  containerPort?: number
}

async function createUpstreamClient(cfg: UpstreamConfig): Promise<Client> {
  const client = new Client({ name: 'mcp-proxy-upstream', version: '1.0.0' })
  if (cfg.type === 'stdio' && cfg.command) {
    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args ?? []
    })
    await client.connect(transport)
  } else if (cfg.type === 'http' && cfg.url) {
    const transport = new StreamableHTTPClientTransport(new URL(cfg.url))
    await client.connect(transport)
  } else {
    throw new Error('Invalid upstream configuration')
  }
  return client
}

function createProxyServer(upstream: Client): McpServer {
  const server = new McpServer(
    { name: 'mcp-proxy', version: '1.0.0' },
    {
      // In SDK 1.x the capabilities may need explicit structure; adapt if needed
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
        completions: {},
        sampling: {}
      }
    }
  )

  // Forward all requests to upstream
  server.setRequestHandler(
    { method: 'tools/list' } as any,
    async (req: any) => {
      const transport = (upstream as any).transport
      if (!transport || typeof transport.request !== 'function') {
        throw new Error('Upstream transport missing request()')
      }
      const result = await transport.request(req.method, req.params ?? {})
      return result
    }
  )

  return server
}

async function startHttpProxy(
  server: McpServer,
  apiKey: string,
  host: string,
  port: number
): Promise<string> {
  const httpServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }
    const authHeader = req.headers['authorization']
    if (authHeader !== `Bearer ${apiKey}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk as Buffer)
    }
    const body = Buffer.concat(chunks).toString('utf8')

    try {
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: () => randomBytes(16).toString('hex')
      })
      res.on('close', () => transport.close())
      await server.connect(transport)
      await transport.handleRequest(req, res, body)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: (err as Error).message }))
    }
  })

  await new Promise<void>((resolve) =>
    httpServer.listen(port, host, () => resolve())
  )
  return `http://${host}:${port}/mcp`
}

export async function startProxy(input: Partial<ActionInput> = {}) {
  const cfg: ActionInput = {
    logDir: input.logDir ?? './logs',
    listen: {
      http: true,
      stdio: false,
      host: '127.0.0.1',
      ...(input.listen ?? {})
    },
    containerImage: input.containerImage,
    containerVersion: input.containerVersion,
    containerPort: input.containerPort ?? 4000,
    upstream: input.upstream
  }

  const log = setupDebugLogging(cfg.logDir)
  log('Starting MCP proxy')

  let upstreamUrl: string | undefined
  let containerId: string | undefined

  if (cfg.containerImage && cfg.containerVersion) {
    const host = cfg.listen?.host ?? '127.0.0.1'
    const port = await findFreePort(undefined, host)
    containerId = runDockerContainer(
      cfg.containerImage,
      cfg.containerVersion,
      port,
      cfg.containerPort!
    )
    log(`Started container ${containerId} at port ${port}`)
    upstreamUrl = `http://${host}:${port}/mcp`
    // Wait some seconds for container to become ready
    await new Promise((r) => setTimeout(r, 3000))
    cfg.upstream = { type: 'http', url: upstreamUrl }
  }

  if (!cfg.upstream) {
    throw new Error('No upstream defined')
  }

  const upstreamClient = await createUpstreamClient(cfg.upstream)
  log('Connected to upstream MCP client')

  const proxyServer = createProxyServer(upstreamClient)
  const apiKey = randomBytes(32).toString('hex')
  const hostListen = cfg.listen?.host ?? '127.0.0.1'
  const portListen =
    cfg.listen?.port ?? (await findFreePort(undefined, hostListen))
  const url = await startHttpProxy(proxyServer, apiKey, hostListen, portListen)
  log(`HTTP proxy listening at ${url}`)

  const output = { apiKey, port: portListen, url, containerId }

  process.on('SIGINT', () => {
    if (containerId) {
      log(`Stopping container ${containerId}`)
      stopDockerContainer(containerId)
    }
    process.exit(0)
  })

  return output
}
