#!/bin/bash
# Double-click launcher for macOS Finder — just relays to start.sh so there's
# a single source of truth for the actual setup/start logic.
cd "$(dirname "$0")"
./start.sh
