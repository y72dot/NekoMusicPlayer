import fs from 'node:fs'

const requiredFiles = [
  'dist/index.html',
  'ops/nginx/nekomusic.conf.example',
  'ops/nginx/music.72dot.cn.conf',
  'ops/deploy/manage-release.sh',
  'ops/deploy/deploy-from-server.sh',
]

const failures = []
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`)
}

if (fs.existsSync('ops/nginx/nekomusic.conf.example')) {
  const nginx = fs.readFileSync('ops/nginx/nekomusic.conf.example', 'utf8')
  for (const path of ['/api/netease/', '/api/netease-media/', '/api/bilibili/', '/api/bilibili-audio/', '/api/bilibili-cdn/']) {
    if (!nginx.includes(path)) failures.push(`nginx config missing ${path}`)
  }
  if (!nginx.includes('bilivideo\\.com|hdslb\\.com')) failures.push('nginx CDN allowlist missing')
  if (!nginx.includes('\\.music\\.126\\.net')) failures.push('NetEase media allowlist missing')
  if (/proxy_pass\s+\$scheme:\/\//.test(nginx)) failures.push('nginx contains an unrestricted scheme proxy')
}

if (fs.existsSync('.github/workflows/deploy.yml')) {
  failures.push('GitHub deployment workflow must remain removed; production deployment is server-side manual')
}

if (fs.existsSync('ops/deploy/deploy-from-server.sh')) {
  const deployScript = fs.readFileSync('ops/deploy/deploy-from-server.sh', 'utf8')
  for (const marker of ['git -C "$repo_root" fetch', 'npm run check', 'manage-release.sh', 'activate "$release_id"', 'rollback "$release_id"', 'test "$health_body" = "ok"']) {
    if (!deployScript.includes(marker)) failures.push(`manual deploy script missing ${marker}`)
  }
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Production deployment assets are structurally valid.')
