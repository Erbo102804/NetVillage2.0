export default function DemoBanner() {
  const isDemo = localStorage.getItem('demo_mode_active') === 'true' ||
                 import.meta.env.VITE_DEMO === 'true'
  if (!isDemo) return null

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center">
      <span className="text-amber-400 text-xs font-medium">
        🎭 Демо-режим — backend недоступен, данные тестовые
      </span>
    </div>
  )
}
