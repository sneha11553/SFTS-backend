#!/bin/sh

set -eu

LABEL="com.sfts.backend"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
LOG_DIR="$HOME/Library/Logs/SFTS-backend"

usage() {
  printf '%s\n' "Usage: $0 {start|stop|restart|status|logs}"
  exit 2
}

service_loaded() {
  launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1
}

case "${1:-}" in
  start)
    mkdir -p "$LOG_DIR"
    if ! service_loaded; then
      launchctl bootstrap "$DOMAIN" "$PLIST"
    fi
    launchctl kickstart -k "$DOMAIN/$LABEL"
    ;;
  stop)
    if service_loaded; then
      launchctl bootout "$DOMAIN/$LABEL"
    fi
    ;;
  restart)
    if service_loaded; then
      launchctl kickstart -k "$DOMAIN/$LABEL"
    else
      mkdir -p "$LOG_DIR"
      launchctl bootstrap "$DOMAIN" "$PLIST"
      launchctl kickstart -k "$DOMAIN/$LABEL"
    fi
    ;;
  status)
    if service_loaded; then
      launchctl print "$DOMAIN/$LABEL"
      printf '%s\n' '--- port 5050 ---'
      lsof -nP -iTCP:5050 -sTCP:LISTEN || true
    else
      printf '%s\n' 'SFTS backend LaunchAgent is not loaded.'
      exit 1
    fi
    ;;
  logs)
    mkdir -p "$LOG_DIR"
    tail -f "$LOG_DIR/stdout.log" "$LOG_DIR/stderr.log"
    ;;
  *)
    usage
    ;;
esac