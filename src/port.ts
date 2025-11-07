import net from 'node:net'

export async function findFreePort(
  preferred?: number,
  host = '127.0.0.1'
): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(preferred ?? 0, host, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        return reject(new Error('Unable to get address'))
      }
      const port = address.port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}
