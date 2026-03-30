#!/usr/bin/env bash
set -euo pipefail
cd ~

# NEXTAUTH_SECRET（本番 server.js 検証用）
if grep -q 'change-in-production' .env.local 2>/dev/null || ! grep -q '^NEXTAUTH_SECRET=' .env.local 2>/dev/null; then
  S=$(openssl rand -base64 48)
  if grep -q '^NEXTAUTH_SECRET=' .env.local 2>/dev/null; then
    sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$S\"|" .env.local
  else
    echo "NEXTAUTH_SECRET=\"$S\"" >> .env.local
  fi
  echo "[ec2-apply] NEXTAUTH_SECRET を更新しました"
else
  echo "[ec2-apply] NEXTAUTH_SECRET は既に設定済みです"
fi

git fetch origin master
git reset --hard origin/master

npm install
npx prisma db push
npm run build

pm2 delete kensetsu-dx 2>/dev/null || true
pm2 start server.js --name kensetsu-dx --cwd "$HOME"
pm2 save

echo "[ec2-apply] ヘルスチェック（起動待ち 8 秒）:"
sleep 8
curl -s -o /dev/null -w "login HTTP %{http_code}\n" http://127.0.0.1:3000/login || true
pm2 status kensetsu-dx
