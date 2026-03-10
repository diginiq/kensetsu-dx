# 建設DX - 現場写真管理アプリ

## プロジェクト概要

日本の中小建設業者（従業員10〜50名）向けの現場写真管理DXツール。
スマートフォンで現場写真を撮影・整理・共有し、工事記録業務を効率化する。

## 技術スタック

| カテゴリ | 採用技術 | バージョン |
|---------|---------|---------|
| フレームワーク | Next.js (App Router) | 14.x |
| 言語 | TypeScript | 5.x (strict: true) |
| スタイリング | Tailwind CSS + shadcn/ui | 3.x |
| ORM | Prisma | 5.x |
| データベース | PostgreSQL | 15+ |
| 認証 | NextAuth.js | 4.x |
| ストレージ | AWS S3 | - |
| PWA | next-pwa | 5.x |

## 設計方針

### ターゲットユーザー
- 日本の中小建設業者（従業員10〜50名）
- 現場作業員（スマホ操作が主、PCは不慣れ）
- 現場監督・施工管理者
- 事務スタッフ（書類作成・報告書管理）

### UI/UXルール

1. **全UI日本語** - ラベル・メッセージ・エラー文言すべて日本語
2. **モバイルファースト** - 基準幅375px、`max-w-screen-sm`で中央寄せ
3. **タップターゲット** - ボタン・リンクは最小44×44px（`min-h-touch min-w-touch`）
4. **フォントサイズ** - 最小14px（`text-xs`以下は使用禁止）
5. **ブランドカラー**
   - Primary（オレンジ）: `#E85D04` - 安全色・CTAボタン
   - Secondary（ブルーグレー）: `#455A64` - ヘッダー・フッター
   - Accent（グリーン）: `#2E7D32` - 完了・承認状態

### コーディングルール

```
コメント    → 日本語OK
変数名      → 英語（camelCase）
関数名      → 英語（camelCase）
型名        → 英語（PascalCase）
定数        → 英語（SCREAMING_SNAKE_CASE）
```

### Next.js App Router 方針

- **Server Component デフォルト** - データ取得はサーバーサイドで実施
- **`'use client'` は最小限** - インタラクション・状態管理が必要なコンポーネントのみ
- **ページはServer Component** - ページファイル（`page.tsx`）は基本サーバー
- **フォームはServer Actions** - `use server` を活用、APIルートは最小限

### ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証グループ（未ログイン用レイアウト）
│   ├── (dashboard)/       # ダッシュボードグループ（ログイン後）
│   ├── api/               # APIルート（必要最小限）
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                # shadcn/uiコンポーネント
│   └── features/          # 機能別コンポーネント
│       ├── photos/        # 写真関連
│       ├── projects/      # 工事案件関連
│       └── reports/       # 報告書関連
├── lib/
│   ├── auth.ts            # NextAuth設定
│   ├── db.ts              # Prismaクライアント
│   ├── s3.ts              # AWS S3ユーティリティ
│   └── utils.ts           # 共通ユーティリティ（cn関数等）
├── types/                 # 型定義
└── hooks/                 # カスタムフック（Client Component用）
```

### データモデル（予定）

- `User` - ユーザー（会社単位でテナント管理）
- `Company` - 建設会社（マルチテナント対応）
- `Project` - 工事案件
- `PhotoRecord` - 現場写真記録
- `PhotoTag` - 写真タグ（工種・工程など）
- `Report` - 報告書（写真帳）

### パフォーマンス方針

- 画像は Next.js `<Image>` コンポーネント必須（最適化・lazy load）
- 写真一覧はvirtual scroll検討（100枚以上対応）
- Prismaクエリはselect指定で必要フィールドのみ取得
- オフライン対応：Service Worker + IndexedDB（next-pwa）

### セキュリティ方針

- S3は署名付きURL（presigned URL）でアクセス、直接公開禁止
- 全APIにNextAuth セッション認証必須
- テナント分離：全クエリに`companyId`フィルタ必須
- 環境変数は`.env.local`（Gitコミット禁止）

## 環境変数

```env
# データベース
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# AWS S3
AWS_REGION="ap-northeast-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_NAME="..."
```

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run lint         # ESLint実行
npm run db:generate  # Prismaクライアント生成
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio起動
```
