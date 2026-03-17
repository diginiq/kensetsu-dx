import Link from 'next/link'
import { createCompany } from './actions'

export default function NewCompanyPage() {
  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/companies" className="text-gray-500 hover:text-gray-700 text-sm">
          ← 一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">新規会社登録</h1>
      </div>

      <form action={createCompany} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            name="companyName"
            required
            placeholder="〇〇建設株式会社"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            name="status"
            defaultValue="TRIAL"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="TRIAL">トライアル</option>
            <option value="ACTIVE">有効</option>
            <option value="SUSPENDED">停止中</option>
          </select>
        </div>

        <hr className="my-2" />
        <p className="text-sm font-medium text-gray-600">管理者アカウント</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            name="adminName"
            required
            placeholder="山田 太郎"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            name="adminEmail"
            type="email"
            required
            placeholder="admin@example.co.jp"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            name="adminPassword"
            type="password"
            required
            placeholder="8文字以上"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 text-white font-bold rounded-lg text-base"
          style={{ backgroundColor: '#E85D04' }}
        >
          登録する
        </button>
      </form>
    </div>
  )
}
