import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const playwrightCli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js')
const serverUrl = 'http://127.0.0.1:5199'

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  })
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(serverUrl)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Vite did not become ready at ${serverUrl} within ${timeoutMs}ms`)
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) return

  if (process.platform === 'win32') {
    // Vite itself is the direct child because it is launched through node,
    // so killing it first closes the listening socket immediately.
    child.kill()
    const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    })
    await Promise.race([
      waitForExit(killer).catch(() => undefined),
      new Promise(resolve => setTimeout(resolve, 2_000)),
    ])
    return
  }

  child.kill('SIGTERM')
  await Promise.race([
    waitForExit(child),
    new Promise(resolve => setTimeout(resolve, 5_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

const vite = run(node, [viteCli, '--host', '127.0.0.1', '--port', '5199', '--strictPort'], {
  detached: false,
})

let exitCode = 1
try {
  await waitForServer()
  const playwright = run(node, [playwrightCli, 'test', ...process.argv.slice(2)], {
    env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: '1' },
  })
  const result = await waitForExit(playwright)
  exitCode = result.code ?? 1
} catch (error) {
  console.error(error)
} finally {
  await stopProcessTree(vite)
}

process.exitCode = exitCode
