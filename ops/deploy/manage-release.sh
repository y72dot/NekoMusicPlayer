#!/usr/bin/env bash
set -euo pipefail

action="${1:-}"
release_id="${2:-}"
deploy_root="/var/www/nekomusic"
releases_dir="$deploy_root/releases"
current_link="$deploy_root/current"
state_dir="$deploy_root/deploy-state"
release_dir="$releases_dir/$release_id"
state_file="$state_dir/$release_id.previous"

if [[ ! "$release_id" =~ ^[0-9]+$ ]]; then
  echo "release id must be numeric" >&2
  exit 2
fi

mkdir -p "$releases_dir" "$state_dir"

case "$action" in
  activate)
    test -f "$release_dir/index.html"
    previous=""
    if [[ -L "$current_link" ]]; then
      previous="$(readlink -f "$current_link" || true)"
    fi
    printf '%s\n' "$previous" > "$state_file"
    ln -sfn "$release_dir" "$current_link"
    ;;
  rollback)
    test -f "$state_file"
    previous="$(head -n 1 "$state_file")"
    if [[ -n "$previous" && -d "$previous" ]]; then
      ln -sfn "$previous" "$current_link"
    else
      rm -f "$current_link"
    fi
    rm -f "$state_file"
    ;;
  finalize)
    rm -f "$state_file"
    mapfile -t old_releases < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2-)
    for old_release in "${old_releases[@]}"; do
      [[ "$old_release" == "$release_dir" ]] || rm -rf -- "$old_release"
    done
    ;;
  *)
    echo "usage: $0 {activate|rollback|finalize} RELEASE_ID" >&2
    exit 2
    ;;
esac
