import fs from 'node:fs'

const requiredFiles = [
  'dist/index.html',
  'ops/nginx/nekomusic.conf.example',
  'ops/nginx/music.72dot.cn.conf',
  'ops/deploy/manage-release.sh',
  '.github/workflows/deploy.yml',
]

const failures = []
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`)
}

if (fs.existsSync('ops/nginx/nekomusic.conf.example')) {
  const nginx = fs.readFileSync('ops/nginx/nekomusic.conf.example', 'utf8')
  for (const path of ['/api/netease/', '/api/bilibili/', '/api/bilibili-audio/', '/api/bilibili-cdn/']) {
    if (!nginx.includes(path)) failures.push(`nginx config missing ${path}`)
  }
  if (!nginx.includes('bilivideo\\.com|hdslb\\.com')) failures.push('nginx CDN allowlist missing')
  if (/proxy_pass\s+\$scheme:\/\//.test(nginx)) failures.push('nginx contains an unrestricted scheme proxy')
}

if (fs.existsSync('.github/workflows/deploy.yml')) {
  const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8')
  for (const marker of ['https://music.72dot.cn', 'AAAAC3NzaC1lZDI1NTE5AAAAIB1aihNvsJykvm35eT1+VsGcb4tRa2hld6NqH+MUV8i/', '.sh rollback', 'curl --fail']) {
    if (!workflow.includes(marker)) failures.push(`deploy workflow missing ${marker}`)
  }
  if (!workflow.includes('test "$health_body" = "ok"')) failures.push('deploy health check must require the exact ok body')
  if (!/deploy:[\s\S]*actions\/checkout@v4[\s\S]*actions\/download-artifact@v4/.test(workflow)) {
    failures.push('deploy job must checkout release scripts before downloading the build')
  }
  if (workflow.includes('StrictHostKeyChecking=no')) failures.push('SSH host verification is disabled')
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Production deployment assets are structurally valid.')
