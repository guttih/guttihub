#!/usr/bin/env bash
# jobctl — add | list | delete      (scheduler = at, tag = #guttihub)
set -euo pipefail
shopt -s lastpipe

TAG="guttihub"                 # marker in queued scripts

json() { jq -nc "$@"; }        # pass ALL args to jq
fail() { json --arg err "$*" '{ok:false,error:$err}'; exit 1; }

show_help() {
cat <<EOF
jobctl  –  manage #${TAG} at(1) jobs
Usage:
    jobctl add   "<YYYY-MM-DD HH:MM>"  "<description>"  "<command...>"
    jobctl list
    jobctl delete <ID|pattern>

Examples:
    jobctl add "2025-05-02 02:15" "grab log snapshot" \\
               'tar -czf "/var/backups/\\\$(hostname)-\\\$(date +%F).tgz" /var/log/*'

    jobctl list
    jobctl delete 13
    jobctl delete "log snapshot"

Exit codes:
    0  success
    1  usage or scheduler error
EOF
}

# ─── internal: iterate over OUR jobs ──────────────────────────────────
each_our_job() {                 # id sched desc cmd
  atq | while read -r id _; do
    script=$(at -c "$id" 2>/dev/null || continue)

    # Find the first line that starts with our tag, then grab the next line = command
    marker=$(printf '%s\n' "$script" | grep -m1 "^#${TAG}") || continue
    read -r _ date time desc_rest <<<"$marker"          # 2025‑05‑02  02:15:00
    datetime="${date} ${time}"                          # => "2025‑05‑02 02:15:00"
    desc=$desc_rest
    cmd=$(printf '%s\n' "$script" | awk "/^#${TAG}/{getline;print;exit}")
    printf '%s\t%s\t%s\t%s\n' "$id" "$datetime" "$desc" "$cmd"

  done
}


# ─── ADD ──────────────────────────────────────────────────────────────
cmd_add() {                    # datetime  desc  cmd…
  [[ $# -ge 3 ]] || fail 'Usage: jobctl add "YYYY-MM-DD HH:MM" "desc" "cmd…"'
  local raw_dt="$1" desc="$2"; shift 2; local cmd="$*"

  # Normalise datetime to <HH:MM YYYY-MM-DD> for at(1)
  if at_dt=$(date -d "$raw_dt" '+%H:%M %Y-%m-%d' 2>/dev/null); then
     iso_dt=$(date -d "$raw_dt" '+%F %T')      # for the #guttihub comment
  else
     fail "Unrecognised date/time: $raw_dt"
  fi

  # Build the script | queue it
  script=$(printf '#%s %s %s\n%s\n' "$TAG" "$iso_dt" "$desc" "$cmd")
  output=$(printf '%s' "$script" | at -M "$at_dt" 2>&1) || fail "$output"

  id=$(printf '%s\n' "$output" | awk '/^job /{print $2}')
  [[ -n $id ]] || fail "$output"

  json --arg id "$id" --arg dt "$raw_dt" --arg d "$desc" --arg c "$cmd" \
       '{ok:true,job:{id:$id,datetime:$dt,description:$d,command:$c}}'
}

# ─── LIST ─────────────────────────────────────────────────────────────
cmd_list() {
  each_our_job | jq -R -s -c '
    split("\n")[:-1] |
    map(split("\t")) |
    {ok:true, jobs: map({
       id:.[0],
       datetime:(.[1]|sub(" +$";"")),
       description:.[2],
       command:.[3]
    })}
  '
}

# ─── DELETE ───────────────────────────────────────────────────────────
cmd_delete() {
  [[ $# -ge 1 ]] || fail 'Usage: jobctl delete <id|pattern>'
  local pat="$*"; deleted=()
  each_our_job | while IFS=$'\t' read -r id _ desc _; do
    if [[ $id == $pat || $desc =~ $pat ]]; then
      atrm "$id" 2>/dev/null || true
      deleted+=("$id")
    fi
  done
  json --argjson deleted "$(printf '%s\n' "${deleted[@]}" | jq -R . | jq -s .)" \
       '{ok:true,deleted:$deleted}'
}

# ─── dispatcher ───────────────────────────────────────────────────────
sub=${1:-}; shift || true
case "$sub" in
    add)        cmd_add "$@" ;;
    list)       cmd_list ;;
    del|delete)  cmd_delete "$@" ;;
    -h|--help|help|"") show_help ;;
  *)           fail 'Unknown command.  See jobctl --help' ;;
esac
