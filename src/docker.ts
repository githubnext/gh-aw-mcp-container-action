import { spawnSync } from 'child_process'

export function runDockerContainer(
  image: string,
  version: string,
  hostPort: number,
  containerPort: number
): string {
  const args = [
    'run',
    '-d',
    '--rm',
    '-p',
    `${hostPort}:${containerPort}`,
    `${image}:${version}`
  ]
  const result = spawnSync('docker', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`docker run failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

export function stopDockerContainer(containerId: string): void {
  spawnSync('docker', ['stop', containerId])
}
