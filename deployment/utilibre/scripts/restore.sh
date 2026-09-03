#!/bin/sh
set -eu

usage() {
  echo "Usage: $0 BACKUP_DIR TARGET (--rehearsal|--live)" >&2
  echo "Targets: healthchecks freshrss wakapi crabfit privatebin freshrss-files" >&2
  exit 2
}

[ "$#" -eq 3 ] || usage
backup_dir=$1
target=$2
mode=$3
[ "$mode" = --rehearsal ] || [ "$mode" = --live ] || usage
[ -d "$backup_dir" ] || { echo "Backup directory not found" >&2; exit 1; }

(cd "$backup_dir" && sha256sum -c SHA256SUMS)

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir"

if [ "$mode" = --live ]; then
  [ -t 0 ] || {
    echo "Live restore requires an interactive terminal." >&2
    exit 1
  }
  printf 'Type RESTORE %s to continue: ' "$target" >&2
  IFS= read -r confirmation
  [ "$confirmation" = "RESTORE $target" ] || {
    echo "Confirmation did not match; nothing changed." >&2
    exit 1
  }
fi

database_rehearsal() {
  database=$1
  dump="$backup_dir/postgres/$database.dump"
  [ -f "$dump" ] || { echo "Database dump not found" >&2; exit 1; }
  rehearsal_db="utilibre_restore_${database}_$(date -u +%Y%m%d%H%M%S)"
  docker compose exec -T postgres createdb -U postgres "$rehearsal_db"
  trap 'docker compose exec -T postgres dropdb -U postgres --if-exists "$rehearsal_db" >/dev/null 2>&1 || true' EXIT HUP INT TERM
  docker compose exec -T postgres pg_restore -U postgres -d "$rehearsal_db" --no-owner < "$dump"
  docker compose exec -T postgres psql -U postgres -d "$rehearsal_db" -Atqc 'SELECT current_database()'
  docker compose exec -T postgres dropdb -U postgres "$rehearsal_db"
  trap - EXIT HUP INT TERM
}

database_live_restore() {
  database=$1
  dump="$backup_dir/postgres/$database.dump"
  [ -f "$dump" ] || { echo "Database dump not found" >&2; exit 1; }
  service=$database
  [ "$database" = crabfit ] && service=
  previous_db="${database}_pre_restore_$(date -u +%Y%m%d%H%M%S)"

  [ -z "$service" ] || docker compose stop "$service"
  if ! docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$database' AND pid <> pg_backend_pid()" \
    -c "ALTER DATABASE \"$database\" RENAME TO \"$previous_db\""; then
    [ -z "$service" ] || docker compose up -d "$service"
    echo "Could not preserve the current database; restore aborted." >&2
    exit 1
  fi

  if ! docker compose exec -T postgres createdb -U postgres -O "$database" "$database" || \
     ! docker compose exec -T postgres pg_restore -U postgres --role="$database" -d "$database" --no-owner < "$dump"; then
    echo "Restore failed; rolling back to the preserved database." >&2
    docker compose exec -T postgres dropdb -U postgres --if-exists "$database" || true
    docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
      -c "ALTER DATABASE \"$previous_db\" RENAME TO \"$database\""
    [ -z "$service" ] || docker compose up -d "$service"
    exit 1
  fi

  [ -z "$service" ] || docker compose up -d "$service"
  echo "Live database restore succeeded. Preserved pre-restore database: $previous_db"
}

file_rehearsal() {
  archive=$1
  rehearsal_dir=$(mktemp -d /tmp/utilibre-restore.XXXXXX)
  trap 'rm -rf -- "$rehearsal_dir"' EXIT HUP INT TERM
  tar -C "$rehearsal_dir" -xzf "$archive"
  find "$rehearsal_dir" -type f -print -quit | grep -q .
  rm -rf -- "$rehearsal_dir"
  trap - EXIT HUP INT TERM
}

file_live_restore() {
  target_dir=$1
  service=$2
  archive=$3
  current="$root_dir/data/$target_dir"
  [ -d "$current" ] || { echo "Current data directory not found: $current" >&2; exit 1; }
  timestamp=$(date -u +%Y%m%d%H%M%S)
  staging_dir=$(mktemp -d "$root_dir/data/.restore-${service}.XXXXXX")
  tar -C "$staging_dir" -xzf "$archive"
  [ -d "$staging_dir/$target_dir" ] || {
    rm -rf -- "$staging_dir"
    echo "Archive does not contain expected $target_dir directory" >&2
    exit 1
  }
  previous="$root_dir/data/${target_dir}.pre-restore-$timestamp"
  docker compose stop "$service"
  mv "$current" "$previous"
  if ! mv "$staging_dir/$target_dir" "$current"; then
    mv "$previous" "$current"
    docker compose up -d "$service"
    rm -rf -- "$staging_dir"
    exit 1
  fi
  rm -rf -- "$staging_dir"
  docker compose up -d "$service"
  echo "Live file restore succeeded. Preserved pre-restore data: $previous"
}

case "$target" in
  healthchecks|freshrss|wakapi|crabfit)
    if [ "$mode" = --rehearsal ]; then
      database_rehearsal "$target"
    else
      database_live_restore "$target"
    fi
    ;;
  privatebin|freshrss-files)
    archive_name=$target
    [ "$target" = freshrss-files ] && archive_name=freshrss-data
    [ "$target" = privatebin ] && archive_name=privatebin-data
    archive="$backup_dir/files/$archive_name.tar.gz"
    [ -f "$archive" ] || { echo "Archive not found" >&2; exit 1; }
    if [ "$mode" = --rehearsal ]; then
      file_rehearsal "$archive"
    elif [ "$target" = privatebin ]; then
      file_live_restore privatebin privatebin "$archive"
    else
      file_live_restore freshrss freshrss "$archive"
    fi
    ;;
  *) usage ;;
esac

[ "$mode" = --live ] || echo "Restore rehearsal succeeded for $target"
