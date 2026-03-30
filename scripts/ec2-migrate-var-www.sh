#!/usr/bin/env bash
# 初回のみ: ~/ から /var/www/kensetsu-dx へ移行し、ec2-apply を実行
set -euo pipefail

OWNER="${SUDO_USER:-$USER}"
sudo mkdir -p /var/www
sudo chown "$OWNER:$OWNER" /var/www

TARGET=/var/www/kensetsu-dx
if [ ! -d "$TARGET/.git" ]; then
  git clone https://github.com/diginiq/kensetsu-dx.git "$TARGET"
else
  git -C "$TARGET" fetch origin master
  git -C "$TARGET" reset --hard origin/master
fi

if [ -f "$HOME/.env.local" ]; then
  cp -f "$HOME/.env.local" "$TARGET/.env.local"
  echo "[migrate] .env.local をコピーしました"
fi
if [ -f "$HOME/.env" ]; then
  cp -f "$HOME/.env" "$TARGET/.env"
fi

export KENSETSU_DX_ROOT="$TARGET"
bash "$TARGET/scripts/ec2-apply.sh"
