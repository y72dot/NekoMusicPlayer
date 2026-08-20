#!/usr/bin/env bash
set -Eeuo pipefail

branch="${1:-main}"
public_url="${PUBLIC_URL:-https://music.72dot.cn}"
deploy_root="${DEPLOY_ROOT:-/var/www/nekomusic}"
playback_cookie_file="${PLAYBACK_ACCEPTANCE_COOKIE_FILE:-}"
playback_csrf_file="${PLAYBACK_ACCEPTANCE_CSRF_FILE:-}"
playback_track_id="${PLAYBACK_ACCEPTANCE_TRACK_ID:-347230}"
require_playback_acceptance="${REQUIRE_PLAYBACK_ACCEPTANCE:-0}"
export DEPLOY_ROOT="$deploy_root"

if [[ ! "$branch" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]]; then
  echo "branch contains unsupported characters" >&2
  exit 2
fi

for command_name in git node npm curl tar; do
  command -v "$command_name" >/dev/null || {
    echo "missing required command: $command_name" >&2
    exit 1
  }
done

repo_root="$(git rev-parse --show-toplevel)"
manage_script="$repo_root/ops/deploy/manage-release.sh"
test -f "$manage_script" || {
  echo "release manager is missing: $manage_script" >&2
  exit 1
}

git -C "$repo_root" fetch --prune origin "$branch"
commit="$(git -C "$repo_root" rev-parse --verify "origin/$branch^{commit}")"
release_id="$(date -u +%Y%m%d%H%M%S)"
release_dir="$deploy_root/releases/$release_id"
build_dir="$(mktemp -d)"
activated=0

cleanup() {
  rm -rf -- "$build_dir"
}

rollback_on_error() {
  exit_code=$?
  if [[ "$activated" == "1" ]]; then
    bash "$manage_script" rollback "$release_id" || true
  fi
  exit "$exit_code"
}

trap cleanup EXIT
trap rollback_on_error ERR

git -C "$repo_root" archive "$commit" | tar -x -C "$build_dir"
cd "$build_dir"
npm ci
npm run check
node scripts/validate-production.mjs

test -f dist/index.html
test ! -e "$release_dir"
install -d "$release_dir"
cp -a dist/. "$release_dir/"
printf '%s\n' "$commit" > "$release_dir/COMMIT"

bash "$manage_script" activate "$release_id"
activated=1

health_body="$(curl --fail --silent --show-error --retry 4 --retry-all-errors --max-time 15 "$public_url/healthz")"
test "$health_body" = "ok"
curl --fail --silent --show-error --retry 4 --retry-all-errors --max-time 15 "$public_url/" >/dev/null

if [[ -n "$playback_cookie_file" ]]; then
  test -r "$playback_cookie_file"
  playback_args=(
    --base-url "$public_url"
    --cookie-file "$playback_cookie_file"
    --track-id "$playback_track_id"
  )
  if [[ -n "$playback_csrf_file" ]]; then
    test -r "$playback_csrf_file"
    playback_args+=(--csrf-file "$playback_csrf_file")
  fi
  node scripts/accept-production-playback.mjs "${playback_args[@]}"
elif [[ "$require_playback_acceptance" == "1" ]]; then
  echo "production playback acceptance is required but PLAYBACK_ACCEPTANCE_COOKIE_FILE is not configured" >&2
  false
else
  echo "warning: live playback acceptance skipped; configure PLAYBACK_ACCEPTANCE_COOKIE_FILE to enable it" >&2
fi

bash "$manage_script" finalize "$release_id"
activated=0
trap - ERR

echo "deployed $commit as release $release_id"
