#!/usr/bin/env bash
# Run once on the server after cloning / to re-install hooks after a fresh clone.
# Installs the tracked hooks from ./hooks/ into .git/hooks/.

set -euo pipefail

REPO_DIR="$(git rev-parse --show-toplevel)"
HOOKS_SRC="$REPO_DIR/hooks"
HOOKS_DST="$REPO_DIR/.git/hooks"

for hook in "$HOOKS_SRC"/*; do
    name="$(basename "$hook")"
    target="$HOOKS_DST/$name"

    if [ -e "$target" ] && [ ! -L "$target" ]; then
        echo "Backing up existing $name -> $name.bak"
        mv "$target" "$target.bak"
    fi

    ln -sf "$hook" "$target"
    chmod +x "$hook"
    echo "Installed: $name"
done

echo "All hooks installed."
