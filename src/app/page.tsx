import Link from 'next/link';

// トップページ（仮）
// 認証後は /dashboard へリダイレクトする予定
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="bg-primary-500 text-white px-4 py-3 safe-top">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-primary-500 font-bold text-sm">建</span>
          </div>
          <h1 className="text-lg font-bold">建設DX</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-screen-sm w-full text-center space-y-6">
          {/* ヒーローセクション */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              現場写真管理システム
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              建設現場の写真を簡単に撮影・管理・共有。
              <br />
              工事記録の効率化を実現します。
            </p>
          </div>

          {/* 機能一覧 */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-4 border border-border shadow-sm"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="font-bold text-sm text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTAボタン */}
          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="block w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-6 rounded-xl text-base text-center transition-colors min-h-touch"
            >
              ログインして始める
            </Link>
            <Link
              href="/register"
              className="block w-full bg-white hover:bg-gray-50 text-primary-500 font-bold py-4 px-6 rounded-xl text-base text-center transition-colors border-2 border-primary-500 min-h-touch"
            >
              無料で新規登録
            </Link>
          </div>

          {/* 補足テキスト */}
          <p className="text-xs text-muted-foreground">
            ※ 開発中のシステムです。正式リリースまでお待ちください。
          </p>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-secondary-700 text-white py-4 px-4 safe-bottom">
        <div className="max-w-screen-sm mx-auto text-center">
          <p className="text-xs text-secondary-200">
            © 2025 建設DX. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: '📸',
    title: '写真撮影・管理',
    description: 'スマホで撮影してすぐ登録。工事別・日付別に整理。',
  },
  {
    icon: '📋',
    title: '工事台帳連携',
    description: '案件ごとに写真を紐付け。進捗管理も一元化。',
  },
  {
    icon: '☁️',
    title: 'クラウド保存',
    description: 'S3に安全保存。現場でも事務所でもアクセス可能。',
  },
  {
    icon: '📱',
    title: 'オフライン対応',
    description: '電波の弱い現場でも動作。後で自動同期。',
  },
];
