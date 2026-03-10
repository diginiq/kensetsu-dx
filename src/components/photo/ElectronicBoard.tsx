'use client'

import { useRef, useCallback } from 'react'
import type { BoardData } from '@/hooks/useCamera'
import { WORK_CATEGORIES, getWorkTypes, getSubTypes } from '@/lib/workTypes'

interface ElectronicBoardProps {
  data: BoardData
  onChange: (data: BoardData) => void
  position: { x: number; y: number }
  onPositionChange: (pos: { x: number; y: number }) => void
  boardRef: React.MutableRefObject<HTMLDivElement | null>
}

export function ElectronicBoard({
  data,
  onChange,
  position,
  onPositionChange,
  boardRef,
}: ElectronicBoardProps) {
  const drag = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'OPTION') return
      e.preventDefault()
      drag.current = { active: true, startX: e.clientX, startY: e.clientY, originX: position.x, originY: position.y }
      boardRef.current?.setPointerCapture(e.pointerId)
    },
    [position, boardRef],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.active) return
      onPositionChange({
        x: drag.current.originX + e.clientX - drag.current.startX,
        y: drag.current.originY + e.clientY - drag.current.startY,
      })
    },
    [onPositionChange],
  )

  const onPointerUp = useCallback(() => {
    drag.current.active = false
  }, [])

  const set = (key: keyof BoardData, value: string) => onChange({ ...data, [key]: value })

  const workTypeItems = getWorkTypes(data.workCategory)
  const subTypeItems = getSubTypes(data.workCategory, data.workType)

  const inputCls =
    'bg-transparent text-white placeholder-white/50 outline-none w-full text-sm leading-tight py-0.5'
  const selectCls =
    'bg-transparent text-white outline-none w-full text-sm leading-tight py-0.5 cursor-pointer'

  return (
    <div
      ref={boardRef as React.LegacyRef<HTMLDivElement>}
      className="absolute touch-none select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: 'rgba(45, 80, 22, 0.87)',
        border: '2px solid rgba(255,255,255,0.8)',
        borderRadius: '4px',
        width: '240px',
        cursor: 'move',
        zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '72%' }} />
        </colgroup>
        <tbody>
          <BoardRow label="工事名">
            <input
              className={inputCls}
              value={data.constructionName}
              onChange={(e) => set('constructionName', e.target.value)}
              placeholder="工事名"
            />
          </BoardRow>

          <BoardRow label="工種">
            <div className="flex gap-1">
              <select
                className={selectCls}
                value={data.workCategory}
                onChange={(e) => {
                  const cat = e.target.value
                  const firstType = WORK_TYPES_FIRST_LABEL[cat] ?? ''
                  onChange({ ...data, workCategory: cat, workType: firstType, subType: '' })
                }}
                style={{ flex: '0 0 50%' }}
              >
                {WORK_CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: '#1a3d0a', color: 'white' }}>
                    {c.replace('工事', '')}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={data.workType}
                onChange={(e) => onChange({ ...data, workType: e.target.value, subType: '' })}
                style={{ flex: '0 0 50%' }}
              >
                <option value="" style={{ background: '#1a3d0a', color: 'white' }}>-</option>
                {workTypeItems.map((t) => (
                  <option key={t.label} value={t.label} style={{ background: '#1a3d0a', color: 'white' }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </BoardRow>

          <BoardRow label="細別">
            <select
              className={selectCls}
              value={data.subType}
              onChange={(e) => set('subType', e.target.value)}
            >
              <option value="" style={{ background: '#1a3d0a', color: 'white' }}>-</option>
              {subTypeItems.map((s) => (
                <option key={s} value={s} style={{ background: '#1a3d0a', color: 'white' }}>
                  {s}
                </option>
              ))}
            </select>
          </BoardRow>

          <BoardRow label="測点">
            <input
              className={inputCls}
              value={data.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="No.10+5.0"
            />
          </BoardRow>

          <BoardRow label="施工者">
            <span className="text-white text-sm">{data.contractor}</span>
          </BoardRow>

          <BoardRow label="撮影日">
            <span className="text-white text-sm">{data.date}</span>
          </BoardRow>
        </tbody>
      </table>
    </div>
  )
}

function BoardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
      <td
        style={{
          padding: '4px 6px',
          borderRight: '1px solid rgba(255,255,255,0.3)',
          color: 'rgba(255,255,255,0.75)',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
        }}
      >
        {label}
      </td>
      <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>{children}</td>
    </tr>
  )
}

// 各カテゴリの最初のworkTypeラベルを返すヘルパー
import { WORK_TYPES } from '@/lib/workTypes'
const WORK_TYPES_FIRST_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(WORK_TYPES).map(([cat, types]) => [cat, types[0]?.label ?? '']),
)
