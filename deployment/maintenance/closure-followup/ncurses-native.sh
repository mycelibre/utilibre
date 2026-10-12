#!/bin/sh
# Private, synthetic terminal data only. Never print control sequences to users.
set -eu
TASK_NCURSES_TMP=$(mktemp -d /tmp/utilibre-ncurses-XXXXXXXX)
trap 'rm -r -- "$TASK_NCURSES_TMP"' EXIT HUP INT TERM
cd "$TASK_NCURSES_TMP"
test -z "$(dpkg --audit)"
for binary in infocmp tic tput clear tabs toe tset; do
  ldd -r "/usr/bin/$binary" > imports
  ! grep -E 'not found|undefined symbol' imports
done
mkdir terminfo
infocmp -x -I xterm > original.ti
tic -x -o "$TASK_NCURSES_TMP/terminfo" original.ti
TERMINFO="$TASK_NCURSES_TMP/terminfo" infocmp -x -I xterm > reopened.ti
sed '/^#/d' original.ti > expected
sed '/^#/d' reopened.ti > actual
cmp expected actual
infocmp -i xterm > analyzed
test "$(tput -T xterm colors)" -gt 0
TERM=xterm clear > clear-sequence
test -s clear-sequence
# Overlong SGR input exercises the advisory's actual analyze_string path.
printf 'fictional-long|synthetic boundary check,\n am,mir,msgr,\n is2=\\E[' > long.ti
i=0
while [ "$i" -lt 799 ]; do printf '1234567;' >> long.ti; i=$((i+1)); done
printf '1234567m,\n use=vt100,\n' >> long.ti
tic -x -o "$TASK_NCURSES_TMP/terminfo" long.ti 2> tic-warnings
TERMINFO="$TASK_NCURSES_TMP/terminfo" infocmp -i fictional-long > long-analysis
echo NATIVE_TERMINAL_ROUNDTRIP_AND_LONG_SGR_PASSED
