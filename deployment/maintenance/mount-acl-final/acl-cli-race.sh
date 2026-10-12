#!/bin/sh
set -eu
TASK_ROOT=/work/mount-acl-final
NEW=$TASK_ROOT/acl-candidate/usr/bin
OLD=$TASK_ROOT/acl-old/bin
export LD_LIBRARY_PATH=$TASK_ROOT/acl-candidate/usr/lib/x86_64-linux-gnu
for variant in old fixed; do
 for tool in getfacl setfacl chacl; do
  TEST_ROOT=$(mktemp -d /tmp/acl-cli-XXXXXX)
  mkdir "$TEST_ROOT/tree" "$TEST_ROOT/other"
  touch "$TEST_ROOT/tree/file" "$TEST_ROOT/other/file"
  "$NEW/setfacl" -m u:2:r "$TEST_ROOT/tree/file"
  BIN=$NEW
  if test "$variant" = old; then BIN=$OLD; fi
  case "$tool" in
   getfacl) set -- "$BIN/getfacl" -R -P -c "$TEST_ROOT/tree" ;;
   setfacl) set -- "$BIN/setfacl" -R -P -m u:1:r "$TEST_ROOT/tree" ;;
   chacl) set -- "$BIN/chacl" -r 'u::rwx,u:1:r--,g::---,m::r--,o::---' "$TEST_ROOT/tree" ;;
  esac
  result=0
  ACL_CLI_FIXTURE=$TEST_ROOT LD_PRELOAD=$TASK_ROOT/acl-output/acl-cli-race.so "$@" > "$TEST_ROOT/result" 2> "$TEST_ROOT/error" || result=$?
  test -e "$TEST_ROOT/triggered"
  # After the anchored child succeeds, chacl rejects the replaced root symlink.
  # Upstream's static diagnostic name still names the child; do not infer the
  # target from that diagnostic. Assert both real inode ACLs below instead.
  if test "$variant:$tool" = fixed:chacl; then
   test "$result" = 1
   grep -q 'Operation not supported' "$TEST_ROOT/error"
  else
   test "$result" = 0
  fi
  if test "$tool" = getfacl; then
   if test "$variant" = fixed; then grep -q '^user:bin:r--' "$TEST_ROOT/result"; else ! grep -q '^user:bin:r--' "$TEST_ROOT/result"; fi
  else
   "$NEW/getfacl" -c -n "$TEST_ROOT/saved/file" > "$TEST_ROOT/saved.acl"
   "$NEW/getfacl" -c -n "$TEST_ROOT/other/file" > "$TEST_ROOT/other.acl"
   if test "$variant" = fixed; then
    grep -q '^user:1:r--' "$TEST_ROOT/saved.acl"
    ! grep -q '^user:1:r--' "$TEST_ROOT/other.acl"
   else
    ! grep -q '^user:1:r--' "$TEST_ROOT/saved.acl"
    grep -q '^user:1:r--' "$TEST_ROOT/other.acl"
   fi
  fi
  printf '%s %s: deterministic directory substitution result verified\n' "$variant" "$tool"
 done
done
