# 写真台帳PDF出力機能 - 実装計画

## 概要
建設工事の発注者提出用「写真台帳」をPDF出力する機能を実装する。
併せて国交省デジタル写真管理情報基準に準拠したZIP出力にも対応する。

---

## 新規依存パッケージ
```
npm install @react-pdf/renderer archiver
npm install -D @types/archiver
```
- `@react-pdf/renderer` : ReactベースのPDF生成（サーバーサイド）
- `archiver` : ZIP生成（国交省基準出力用）
- 日本語フォント: Noto Sans JP を `public/fonts/` に配置

---

## 新規ファイル一覧（14ファイル）

### 共通・型定義
| ファイル | 目的 |
|---------|------|
| `src/lib/album/types.ts` | AlbumPhoto, CaptionData, AlbumLayout 等の型定義 |
| `src/lib/validations/album.ts` | Zod バリデーションスキーマ |

### 台帳作成ページ（4ステップウィザード）
| ファイル | 目的 |
|---------|------|
| `src/app/dashboard/sites/[siteId]/album/page.tsx` | サーバーコンポーネント（認証・データ取得） |
| `src/app/dashboard/sites/[siteId]/album/AlbumWizardClient.tsx` | クライアントコンポーネント（ウィザード本体） |
| `src/components/features/album/PhotoSelectionStep.tsx` | Step1: 写真選択（フォルダツリー+チェックボックス+並び替え） |
| `src/components/features/album/LayoutSelectionStep.tsx` | Step2: レイアウト選択（3パターン） |
| `src/components/features/album/PreviewStep.tsx` | Step3: プレビュー（ページ送り+キャプション編集） |
| `src/components/features/album/AlbumPagePreview.tsx` | プレビュー用の1ページHTML描画コンポーネント |
| `src/components/features/album/DownloadStep.tsx` | Step4: PDFダウンロード+国交省出力ボタン |

### PDF生成バックエンド
| ファイル | 目的 |
|---------|------|
| `src/lib/pdf/albumDocument.tsx` | @react-pdf/renderer のPDFテンプレート（3レイアウト対応） |
| `src/lib/pdf/albumStyles.ts` | PDF用スタイルシート定義 |
| `src/app/api/sites/[siteId]/album/generate/route.ts` | PDF生成API（POST → PDF返却） |

### 国交省基準出力バックエンド
| ファイル | 目的 |
|---------|------|
| `src/lib/album/xmlBuilder.ts` | PHOTO.XML 生成 |
| `src/app/api/sites/[siteId]/album/export/route.ts` | ZIP生成API（POST → ZIP返却） |

---

## 修正ファイル（1ファイル）
| ファイル | 変更内容 |
|---------|---------|
| `src/app/dashboard/sites/[siteId]/page.tsx` | 「写真台帳を作成」ボタンを追加（アルバムページへのリンク） |
| `src/lib/storage.ts` | `getPhotoBuffer()` 関数を追加（S3/ローカルから画像バッファ取得） |

---

## ウィザードUI設計

### ステッパー
```
[1 写真選択] ── [2 レイアウト] ── [3 プレビュー] ── [4 ダウンロード]
```
- アクティブ: オレンジ(#E85D04)
- 完了済み: グリーン(#2E7D32)
- 未到達: グレー

### Step 1: 写真選択
- フォルダツリー表示（既存API `/api/sites/{siteId}/folders` 再利用）
- フォルダクリックでそのフォルダの写真をグリッド表示
- 各写真にチェックボックス、フォルダ単位の一括選択
- 選択済み写真を下部にサムネイルストリップ表示
- ドラッグで並び替え（HTML5 Drag & Drop、追加ライブラリ不要）
- 「N枚選択中」バッジ表示

### Step 2: レイアウト選択
3つのラジオカード:
- **2枚/ページ（A4縦）** - 写真大きめ、見やすい
- **4枚/ページ（A4縦）** - コンパクト
- **1枚/ページ（A4横）** - 大判写真用

### Step 3: プレビュー
- A4比率のHTMLプレビュー（PDF生成せずに高速表示）
- ページ送り（< 1/N >）
- 各写真のキャプション編集:
  - 写真番号（自動: 写真-001）
  - 工種（テキスト入力、boardDataから初期値）
  - 撮影日（読み取り専用）
  - 撮影箇所（テキスト入力、boardDataから初期値）
  - メモ（テキストエリア）

### Step 4: ダウンロード
- 「PDFダウンロード」ボタン（プライマリ・オレンジ）
  - ファイル名: `{工事名}_写真台帳_{YYYYMMDD}.pdf`
- 「国交省デジタル写真出力」ボタン（アウトライン）
  - ファイル名: `{工事名}_写真データ_{YYYYMMDD}.zip`

---

## PDFレイアウト設計

### 共通構成
- **ヘッダー**: 工事名 | 施工者名 | 発注者名
- **フッター**: ページ番号（ページ N / 全M）

### 2枚/ページ（A4縦 210×297mm）
```
┌──────────────────────────┐
│  工事名 | 施工者 | 発注者  │
├──────────────────────────┤
│  ┌──────────┐ 写真-001   │
│  │  Photo1  │ 工種:      │
│  │          │ 撮影日:    │
│  └──────────┘ 箇所: メモ: │
├──────────────────────────┤
│  ┌──────────┐ 写真-002   │
│  │  Photo2  │ 工種:      │
│  │          │ 撮影日:    │
│  └──────────┘ 箇所: メモ: │
├──────────────────────────┤
│             ページ 1 / N  │
└──────────────────────────┘
```

### 4枚/ページ（A4縦）- 2×2グリッド
### 1枚/ページ（A4横 297×210mm）- 大判表示

---

## 国交省デジタル写真管理情報基準 ZIP構成

```
output.zip
├── PHOTO/
│   ├── 土工/
│   │   ├── photo_001.jpg
│   │   └── photo_002.jpg
│   ├── 鉄筋工/
│   │   └── photo_003.jpg
│   └── ...
└── PHOTO.XML
```

### PHOTO.XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<photoInformation>
  <constructionName>○○工事</constructionName>
  <contractor>○○建設</contractor>
  <photos>
    <photo>
      <fileName>PHOTO/土工/photo_001.jpg</fileName>
      <date>2026-03-10</date>
      <workType>土工</workType>
      <subType>掘削</subType>
      <location>No.10+5.0</location>
      <memo>メモ</memo>
    </photo>
  </photos>
</photoInformation>
```

---

## API設計

### POST `/api/sites/[siteId]/album/generate`
- リクエスト: `{ layout, photos: [{ photoId, caption }] }`
- レスポンス: `application/pdf` バイナリ
- 処理: セッション認証 → Zod検証 → 写真取得 → @react-pdf/renderer → PDF返却
- `export const runtime = 'nodejs'`
- `export const maxDuration = 60`

### POST `/api/sites/[siteId]/album/export`
- リクエスト: `{ photos: [{ photoId, caption }] }`
- レスポンス: `application/zip` バイナリ
- 処理: セッション認証 → Zod検証 → 写真取得 → archiver でZIP生成 → 返却

---

## 実装順序

1. **基盤**: 型定義 + バリデーション + storage.ts に getPhotoBuffer 追加
2. **ページ骨格**: album/page.tsx + AlbumWizardClient.tsx + 現場詳細への導線
3. **Step1**: PhotoSelectionStep（フォルダツリー・写真選択・並び替え）
4. **Step2**: LayoutSelectionStep（レイアウト選択カード）
5. **Step3**: PreviewStep + AlbumPagePreview（HTML/CSSプレビュー・キャプション編集）
6. **PDF生成**: フォント配置 → albumStyles.ts → albumDocument.tsx → generate API
7. **国交省出力**: xmlBuilder.ts → export API
8. **Step4**: DownloadStep（ダウンロードボタン・進捗表示）
