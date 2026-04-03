export type AlbumLayout = 'A4_PORTRAIT_2' | 'A4_PORTRAIT_4' | 'A4_LANDSCAPE_1';

export interface CaptionData {
  photoNumber: string; // 例: "写真-001"
  workType: string;    // 例: "土工"
  subType?: string;    // 例: "掘削"（国交省基準等で使う任意項目）
  date: string;        // YYYY-MM-DD 等の形式
  location: string;    // 例: "No.10+5.0"
  memo: string;        // 自由入力メモや略図などの説明
}

export interface AlbumPhoto {
  photoId: string;     // DB上の写真ID
  url: string;         // オリジナル画像URL（プレビュー用）
  thumbUrl: string;    // サムネイル画像URL（UI表示用）
  caption: CaptionData;
}

export interface GenerateAlbumRequest {
  layout: AlbumLayout;
  photos: AlbumPhoto[];
}

export interface ExportXmlRequest {
  photos: AlbumPhoto[];
}
