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

### 既に `~/` で動いている場合の移行

リポジトリのスクリプトを使います（`ubuntu` ユーザーで、`~/.env.local` がある前提）。

```bash
cd ~/kensetsu-dx   # または一度 scp で scripts を取得
bash scripts/ec2-migrate-var-www.sh
```

初回は `sudo` で `/var/www` の所有者を直します。完了後は **`/var/www/kensetsu-dx` がアプリの正** となり、`scripts/ec2-apply.sh` はこのディレクトリを自動で使います。

## 環境変数（`.env.local`）

必須:

- `DATABASE_URL`
- `NEXTAUTH_URL` — 本番のトップURL（例: `https://ksdx.jp`）。ログアウトリダイレクトに使用されます。
- `NEXTAUTH_SECRET` — **32文字以上**のランダム文字列（`openssl rand -base64 48` など）。

任意:

- AWS S3（メッセージ添付・写真のクラウド保存）
- SMTP（新着メッセージのメール通知）
- VAPID 鍵（Web Push）。`ec2-apply.sh` 未設定時は自動生成することも可能。

`ec2-apply.sh` 実行時、**SMTP のコメントテンプレ**が未追記なら `.env.local` に追記されます。**VAPID** が未設定なら **自動で鍵を生成して追記**します（`mailto:` は後から編集可）。

### SMTP（メール通知）

コメントを外し、自社の SMTP に合わせて設定します。

| 変数 | 例 |
|------|-----|
| `SMTP_HOST` | `smtp.sendgrid.net` など |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false`（STARTTLS のことが多い） |
| `SMTP_USER` / `SMTP_PASS` | プロバイダの指示に従う |
| `EMAIL_FROM` | 送信元（ドメインの SPF / DKIM を合わせると届きやすい） |

未設定のままではメール送信はスキップされます（アプリは起動します）。

## AWS S3（本番の目安）

- **バケットは非公開**のまま、アプリは **IAM ユーザー＋API キー** または **インスタンスロール** で `PutObject` / `GetObject` を使用します。
- メッセージ添付・写真は **オブジェクトキー** を DB に保存し、表示時に **署名付き URL** を発行する運用です（公開 `read` バケットポリシーは不要）。

### IAM ポリシー例（最小イメージ）

対象バケット名を `YOUR_BUCKET` に置き換えてください。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
    }
  ]
}
```

### ライフサイクル（任意）

古い添付を自動削除する場合は、プレフィックス `messages/` に対して有効期限ルールを付けられます。業務要件に合わせて日数を決めてください。

### CORS

ブラウザから **直接 S3 に PUT** しない構成であれば、通常はバケット CORS は不要です（アプリ経由で署名付き URL を返すため）。

## ビルドと PM2

```bash
cd /var/www/kensetsu-dx
git pull origin master
bash scripts/ec2-apply.sh
```

または手動:

```bash
cd /var/www/kensetsu-dx
npm ci
npx prisma db push
npm run build
pm2 delete kensetsu-dx 2>/dev/null || true
pm2 start server.js --name kensetsu-dx --cwd /var/www/kensetsu-dx
pm2 save
```

`package.json` の `start` は `node server.js`（Next.js + Socket.io）です。`next start` のみでは WebSocket が動きません。

## ヘルスチェック

- `GET /api/health` — JSON `{ ok: true, ... }`（認証なし）。ロードバランサや簡易監視向け。

## ログローテーション（PM2）

ディスク圧迫を防ぐ例:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## HTTPS でドメインが開かないとき（`https://ksdx.jp` が表示されない）

Next.js（PM2）は通常 **`127.0.0.1:3000`** のみで待ち受けます。**ブラウザの HTTPS（443）** 用には別途 **リバースプロキシ** と **ファイアウォール開放** が必要です。

### 1. AWS セキュリティグループ

インスタンスに紐づくセキュリティグループの **インバウンド** に次を追加してください。

| タイプ | ポート | ソース |
|--------|--------|--------|
| HTTPS | 443 | 0.0.0.0/0（必要に応じて制限） |
| HTTP | 80 | 0.0.0.0/0（Let's Encrypt 認証用） |
| SSH | 22 | 管理者 IP のみ推奨 |

**3000 番を全世界に開ける運用は避けてください。** 公開は 80/443 経由にします。

### 2. nginx + Let’s Encrypt（例）

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

サーバーブロック例（`/etc/nginx/sites-available/ksdx.jp`）。**WebSocket（メッセージ用 `/ws`）** も同じ upstream に流します。

```nginx
server {
    listen 80;
    server_name ksdx.jp www.ksdx.jp;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`http` ブロック内（`nginx.conf` の `http {` 直下など）に **WebSocket 用の Connection マップ** を 1 回だけ追加します。

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

有効化と再読み込み:

```bash
sudo ln -sf /etc/nginx/sites-available/ksdx.jp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ksdx.jp -d www.ksdx.jp
```

### 3. 動作確認

- `curl -I https://ksdx.jp/login` で **HTTP/2 200** 付近が返ること
- `pm2 status` で `kensetsu-dx` が **online** であること

DNS は `ksdx.jp` → インスタンスの **パブリック IPv4** を指している必要があります（Elastic IP 推奨）。

## NEXTAUTH_SECRET について

`server.js` は本番起動時に `NEXTAUTH_SECRET` が短すぎる、またはプレースホルダー文字列の場合は **プロセスを終了** します。デプロイ前に必ず本番用シークレットを設定してください。
