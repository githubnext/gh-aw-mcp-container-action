# GitHub Agentic Workflows MCP Proxy Action

This GitHub Custom Action is responsible for mounting an MCP behind a HTTP
transport to isolate the MCP from the main container.

## Inputs

### Required Inputs

- **`type`** (required): Upstream connection type. Must be either `stdio` or
  `http`.

### Optional Inputs

#### For `stdio` type:

- **`command`**: Command to execute (required when `type` is `stdio`)
- **`args`**: JSON array of command arguments (e.g., `'["arg1", "arg2"]'`)
- **`env`**: JSON object of environment variables (e.g.,
  `'{"NODE_ENV": "production"}'`)

#### For `http` type:

- **`url`**: URL for HTTP connection (required when `type` is `http`)
- **`headers`**: JSON object of HTTP headers (e.g.,
  `'{"Authorization": "Bearer token"}'`)

#### General:

- **`container`**: Container name
- **`container-image`**: Container image to run
- **`container-version`**: Container version/tag
- **`logs-dir`**: Directory for log files (default: `./logs`)

## Outputs

- **`url`**: The URL of the proxy server
- **`port`**: The port number the proxy is running on
- **`token`**: The API token for accessing the proxy

## Example Usage

### Example 1: HTTP Upstream

```yaml
- name: Start MCP Proxy
  uses: githubnext/gh-aw-mcp-container-action@v1
  with:
    type: http
    url: http://localhost:3000/mcp
    headers: '{"Authorization": "Bearer my-token"}'
```

### Example 2: stdio Upstream

```yaml
- name: Start MCP Proxy
  uses: githubnext/gh-aw-mcp-container-action@v1
  with:
    type: stdio
    command: node
    args: '["mcp-server.js"]'
    env: '{"NODE_ENV": "production", "DEBUG": "true"}'
```

### Example 3: With Container Image

```yaml
- name: Start MCP Proxy
  uses: githubnext/gh-aw-mcp-container-action@v1
  with:
    type: http
    url: http://localhost:3000/mcp
    container-image: my-mcp-server:latest
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development instructions.
