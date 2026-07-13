import { ROUND_MAX_DRAWS } from '../../engine/constants'
import { DiscardFeedbackPanel } from '../components/DiscardFeedbackPanel'
import { Hand } from '../components/Hand'
import { NewRoundButton } from '../components/NewRoundButton'
import { RoundSummaryModal } from '../components/RoundSummaryModal'
import { useTrainingRound } from '../hooks/useTrainingRound'
import styles from './DiscardTrainingScreen.module.css'

export function DiscardTrainingScreen() {
  const { state, phase, lastExplanation, stats, draw, discard, proceedAfterFeedback, newRound } =
    useTrainingRound()

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>麻將新手訓練中心</h1>
          <p className={styles.subtitle}>出牌訓練 · 台灣麻將 16 張</p>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.turnCounter}>
            第 {state.turnIndex} / {ROUND_MAX_DRAWS} 巡
          </span>
          <NewRoundButton onClick={newRound} label="重新開始本局" />
        </div>
      </header>

      <main className={styles.main}>
        {phase === 'idle' && (
          <div className={styles.idlePanel}>
            <p>準備好了嗎？點擊摸牌開始這一局。</p>
            <button type="button" className={styles.drawButton} onClick={draw}>
              摸牌
            </button>
          </div>
        )}

        {phase === 'awaiting-discard' && (
          <div className={styles.discardPanel}>
            <p className={styles.instruction}>
              摸到了一張新牌（虛線右側），點選要打出的牌。
            </p>
            <Hand hand={state.hand} drawnTile={state.drawnTile} onDiscard={discard} />
          </div>
        )}

        {phase === 'feedback' && lastExplanation && (
          <DiscardFeedbackPanel
            explanation={lastExplanation}
            onContinue={proceedAfterFeedback}
            continueLabel={state.status === 'playing' ? '摸下一張' : '查看本局結果'}
          />
        )}
      </main>

      {phase === 'round-over' && (state.status === 'won' || state.status === 'drawn') && (
        <RoundSummaryModal
          status={state.status}
          totalTurns={stats.totalTurns}
          optimalTurns={stats.optimalTurns}
          onNewRound={newRound}
        />
      )}
    </div>
  )
}
