import { useState } from 'react'
import { DiscardTrainingScreen } from './ui/screens/DiscardTrainingScreen'
import { SingleHandScreen } from './ui/screens/SingleHandScreen'

type Mode = 'discard-training' | 'single-hand'

const tabs: Array<{ mode: Mode; label: string }> = [
  { mode: 'discard-training', label: '出牌訓練' },
  { mode: 'single-hand', label: '路線分析' },
]

function App() {
  const [mode, setMode] = useState<Mode>('discard-training')

  return (
    <>
      <nav style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '4px',
        padding: '12px 16px 0',
        background: 'var(--color-bg)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            onClick={() => setMode(tab.mode)}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              background: mode === tab.mode ? 'var(--color-surface)' : 'transparent',
              color: mode === tab.mode ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontWeight: mode === tab.mode ? 700 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderBottom: mode === tab.mode ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {mode === 'discard-training' && <DiscardTrainingScreen />}
      {mode === 'single-hand' && <SingleHandScreen />}
    </>
  )
}

export default App
