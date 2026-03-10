'use client'

import { useState } from 'react'

export interface FolderNode {
  id: string
  name: string
  workTypeCode: string | null
  parentFolderId: string | null
  sortOrder: number
  _count: { photos: number }
  children: FolderNode[]
}

interface FolderTreeProps {
  folders: FolderNode[]
  siteId: string
  selectedFolderId: string | null
  onSelect: (folderId: string | null) => void
  onRefresh: () => void
}

export function FolderTree({ folders, siteId, selectedFolderId, onSelect, onRefresh }: FolderTreeProps) {
  const [addingParent, setAddingParent] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd(parentId: string | null) {
    setNewFolderParentId(parentId)
    setNewFolderName('')
    setAddingParent(true)
  }

  async function submitAdd() {
    if (!newFolderName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentFolderId: newFolderParentId }),
      })
      if (res.ok) { setAddingParent(false); onRefresh() }
    } finally { setSaving(false) }
  }

  async function handleDelete(folderId: string, name: string) {
    if (!confirm(`「${name}」フォルダを削除しますか？\nフォルダ内の写真は未分類になります。`)) return
    const res = await fetch(`/api/sites/${siteId}/folders/${folderId}`, { method: 'DELETE' })
    if (res.ok) { onRefresh(); if (selectedFolderId === folderId) onSelect(null) }
  }

  async function handleRename(folderId: string, currentName: string) {
    const newName = prompt('新しいフォルダ名を入力してください', currentName)
    if (!newName || newName === currentName) return
    const res = await fetch(`/api/sites/${siteId}/folders/${folderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) onRefresh()
  }

  const totalPhotos = folders.reduce((sum, f) => sum + f._count.photos + f.children.reduce((s, c) => s + c._count.photos, 0), 0)

  return (
    <div>
      {/* 新規フォルダ追加フォーム */}
      {addingParent && (
        <div className="flex gap-2 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitAdd()}
            placeholder={newFolderParentId ? '細別名を入力' : 'フォルダ名を入力'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={submitAdd} disabled={saving} className="px-3 py-2 text-white text-sm font-bold rounded-lg" style={{ backgroundColor: '#E85D04' }}>
            追加
          </button>
          <button onClick={() => setAddingParent(false)} className="px-3 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg">
            取消
          </button>
        </div>
      )}

      {/* 全写真（フォルダ絞り込みなし） */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-colors ${selectedFolderId === null ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}
      >
        <FolderIcon className="w-5 h-5 text-gray-400" />
        <span className="flex-1 text-sm font-medium text-gray-700">すべての写真</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{totalPhotos}枚</span>
      </button>

      {/* 未分類 */}
      <button
        onClick={() => onSelect('unclassified')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-2 text-left transition-colors ${selectedFolderId === 'unclassified' ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}
      >
        <FolderIcon className="w-5 h-5 text-gray-300" />
        <span className="flex-1 text-sm text-gray-500">未分類</span>
      </button>

      {/* フォルダツリー */}
      <div className="space-y-1">
        {folders.map(folder => (
          <FolderNodeItem
            key={folder.id}
            folder={folder}
            depth={0}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onRename={handleRename}
            onDelete={handleDelete}
            onAddChild={fid => handleAdd(fid)}
          />
        ))}
      </div>

      {/* ルートフォルダ追加ボタン */}
      <button
        onClick={() => handleAdd(null)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
      >
        <PlusIcon />
        フォルダを追加
      </button>
    </div>
  )
}

interface FolderNodeItemProps {
  folder: FolderNode
  depth: number
  selectedFolderId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
  onAddChild: (parentId: string) => void
}

function FolderNodeItem({ folder, depth, selectedFolderId, onSelect, onRename, onDelete, onAddChild }: FolderNodeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = selectedFolderId === folder.id
  const hasChildren = folder.children.length > 0
  const childPhotoCount = folder.children.reduce((s, c) => s + c._count.photos, 0)
  const totalCount = folder._count.photos + childPhotoCount

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className={`flex items-center gap-1 px-3 py-2.5 rounded-xl transition-colors ${isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
        {/* 展開ボタン */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`w-5 h-5 flex items-center justify-center rounded text-gray-400 ${hasChildren ? 'hover:bg-gray-200' : ''}`}
        >
          {hasChildren ? (expanded ? <ChevronDownIcon /> : <ChevronRightIcon />) : <span className="w-2 h-2 rounded-full bg-gray-200" />}
        </button>

        {/* フォルダアイコン + 名前 */}
        <button className="flex-1 flex items-center gap-2 min-w-0 text-left" onClick={() => onSelect(folder.id)}>
          <FolderIcon className="w-4 h-4 shrink-0" style={{ color: '#E85D04' }} />
          <span className="text-sm font-medium truncate">{folder.name}</span>
        </button>

        {/* 枚数バッジ */}
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{totalCount}枚</span>

        {/* アクションメニュー */}
        <div className="flex items-center gap-1 shrink-0">
          {depth === 0 && (
            <button onClick={() => onAddChild(folder.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400" title="サブフォルダ追加">
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onRename(folder.id, folder.name)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400" title="名前変更">
            <PencilIcon />
          </button>
          <button onClick={() => onDelete(folder.id, folder.name)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500" title="削除">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* 子フォルダ */}
      {expanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {folder.children.map(child => (
            <FolderNodeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────
function FolderIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'w-5 h-5'} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}
function ChevronDownIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
}
function ChevronRightIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
}
function PlusIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
}
function PencilIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
}
function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
}
