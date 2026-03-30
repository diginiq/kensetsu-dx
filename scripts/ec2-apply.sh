#!/usr/bin/env bash
set -euo pipefail

if [ -n "${KENSETSU_DX_ROOT:-}" ]; then
  APP_DIR="$KENSETSU_DX_ROOT"
elif [ -d /var/www/kensetsu-dx/.git ]; then
  APP_DIR=/var/www/kensetsu-dx
else
  APP_DIR="$HOME"
fi

cd "$APP_DIR"
ENV_FILE="$APP_DIR/.env.local"

echo "[ec2-apply] APP_DIR=$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ec2-apply] 警告: $ENV_FILE がありません。手動で作成してください。" >&2
  touch "$ENV_FILE"
fi

# NEXTAUTH_SECRET（本番 server.js 検証用）
if grep -q 'change-in-production' "$ENV_FILE" 2>/dev/null || ! grep -q '^NEXTAUTH_SECRET=' "$ENV_FILE" 2>/dev/null; then
  S=$(openssl rand -base64 48)
  if grep -q '^NEXTAUTH_SECRET=' "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$S\"|" "$ENV_FILE"
  else
    echo "NEXTAUTH_SECRET=\"$S\"" >> "$ENV_FILE"
  fi
  echo "[ec2-apply] NEXTAUTH_SECRET を更新しました"
else
  echo "[ec2-apply] NEXTAUTH_SECRET は既に設定済みです"
fi

git fetch origin master
git reset --hard origin/master

npm install

# SMTP テンプレ（メール通知用・任意）
if ! grep -q 'KSDX_SMTP_TEMPLATE' "$ENV_FILE" 2>/dev/null; then
  cat >> "$ENV_FILE" << 'SMTP_EOF'

# --- KSDX_SMTP_TEMPLATE（# を外して値を入れると新着メールが送られます）---
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=
# SMTP_PASS=
# EMAIL_FROM=noreply@example.com
SMTP_EOF
  echo "[ec2-apply] SMTP テンプレートを .env.local に追記しました"
fi

# Web Push 用 VAPID（未設定時のみ自動生成）
if ! grep -q '^VAPID_PUBLIC_KEY=' "$ENV_FILE" 2>/dev/null; then
  export APP_ENV_FILE="$ENV_FILE"
  node <<'NODE'
const w = require('web-push')
const fs = require('fs')
const p = process.env.APP_ENV_FILE
const v = w.generateVAPIDKeys()
fs.appendFileSync(
  p,
  `\nVAPID_SUBJECT="mailto:noreply@ksdx.jp"\nVAPID_PUBLIC_KEY="${v.publicKey}"\nVAPID_PRIVATE_KEY="${v.privateKey}"\n`,
)
NODE
  echo "[ec2-apply] VAPID 鍵を .env.local に追加しました（mailto は必要に応じて変更可）"
fi

npx prisma db push
npm run build

pm2 delete kensetsu-dx 2>/dev/null || true
pm2 start server.js --name kensetsu-dx --cwd "$APP_DIR"
pm2 save

echo "[ec2-apply] ヘルスチェック（起動待ち 8 秒）:"
sleep 8
curl -s -o /dev/null -w "login %{http_code}\n" http://127.0.0.1:3000/login || true
curl -s -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:3000/api/health || true
pm2 status kensetsu-dx
