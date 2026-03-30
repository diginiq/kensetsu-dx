# 本番サーバー（EC2）デプロイ手順

## 推奨ディレクトリ構成

アプリをホーム直下に直接置かず、専用ディレクトリで Git 管理することを推奨します。

```bash
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/diginiq/kensetsu-dx.git
cd kensetsu-dx
```

既存の `~/` 直下展開から移行する場合は、`.env.local` をコピーしてから `~/` の古いファイルを退避してください。

## 環境変数（`.env.local`）

必須:

- `DATABASE_URL`
- `NEXTAUTH_URL` — 本番のトップURL（例: `https://ksdx.jp`）。ログアウトリダイレクトに使用されます。
- `NEXTAUTH_SECRET` — **32文字以上**のランダム文字列（`openssl rand -base64 48` など）。

任意:

- AWS S3（メッセージ添付・写真のクラウド保存）
- SMTP（新着メッセージのメール通知）
- VAPID 鍵（Web Push）。生成: `npx web-push generate-vapid-keys`

## ビルドと PM2

```bash
cd /var/www/kensetsu-dx
git pull origin master
npm ci
npx prisma db push
npm run build
pm2 delete kensetsu-dx 2>/dev/null || true
pm2 start server.js --name kensetsu-dx --cwd /var/www/kensetsu-dx
pm2 save
```

`package.json` の `start` は `node server.js`（Next.js + Socket.io）です。`next start` のみでは WebSocket が動きません。

## NEXTAUTH_SECRET について

`server.js` は本番起動時に `NEXTAUTH_SECRET` が短すぎる、またはプレースホルダー文字列の場合は **プロセスを終了** します。デプロイ前に必ず本番用シークレットを設定してください。
