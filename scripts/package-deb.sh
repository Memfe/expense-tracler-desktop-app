#!/usr/bin/env bash
# Packages the built Linux binary into a double-click installable .deb for
# Debian/Ubuntu/Mint. Run after `make build-linux` (or let this script build).
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="1.0.0"
PKG_NAME="expense-tracker"
BINARY="build/bin/expense_tracker"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

# Build the Linux binary if it is missing (webkit2gtk-4.1 on Mint 22+).
if [[ ! -f "$BINARY" ]]; then
  echo "==> Building the Linux binary first..."
  wails build -platform linux/amd64 -tags webkit2_41
fi
[[ -f "$BINARY" ]] || { echo "ERROR: $BINARY not found"; exit 1; }

echo "==> Staging package contents..."
mkdir -p "$STAGING/DEBIAN"
mkdir -p "$STAGING/usr/local/bin"
mkdir -p "$STAGING/usr/share/applications"
mkdir -p "$STAGING/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$STAGING/usr/share/icons/hicolor/512x512/apps"

# Control file (runtime libraries a fresh Mint/Debian machine needs).
cat > "$STAGING/DEBIAN/control" <<EOF
Package: ${PKG_NAME}
Version: ${VERSION}
Section: office
Priority: optional
Architecture: amd64
Maintainer: memfe <memfe@users.noreply.github.com>
Depends: libgtk-3-0 | libgtk-3-0t64, libwebkit2gtk-4.1-0, libglib2.0-0 | libglib2.0-0t64
Description: Expenser - offline income and expense tracker
 A Wails desktop app that records income and expenses locally in SQLite,
 with a dashboard, categories, CSV export and database backups.
 No cloud, no account: all data stays on the machine.
EOF

# Menu launcher.
cat > "$STAGING/usr/share/applications/${PKG_NAME}.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Expenser
Comment=Offline income and expense tracker
Exec=/usr/local/bin/expense_tracker
Icon=expense-tracker
Terminal=false
Categories=Office;Finance;
StartupWMClass=expense_tracker
EOF

# Binary + icons (downscaled from build/appicon.png).
install -m 0755 "$BINARY" "$STAGING/usr/local/bin/expense_tracker"
go run ./scripts/resize-icon build/appicon.png \
  512 "$STAGING/usr/share/icons/hicolor/512x512/apps/${PKG_NAME}.png" \
  256 "$STAGING/usr/share/icons/hicolor/256x256/apps/${PKG_NAME}.png"

echo "==> Building the .deb..."
OUT="build/bin/${PKG_NAME}_${VERSION}_amd64.deb"
mkdir -p build/bin
dpkg-deb --build --root-owner-group "$STAGING" "$OUT"
dpkg-deb --info "$OUT" | head -20
echo "==> Created $OUT"