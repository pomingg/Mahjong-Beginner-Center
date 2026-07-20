import { DiscardFeedbackPanel } from '../components/DiscardFeedbackPanel'
import { Hand } from '../components/Hand'
import { HandAnalysisPanel } from '../components/HandAnalysisPanel'
import { NewRoundButton } from '../components/NewRoundButton'
import { RouteComparisonPanel } from '../components/RouteComparisonPanel'
import { useSingleHand } from '../hooks/useSingleHand'
import styles from './SingleHandScreen.module.css'

export function SingleHandScreen() {
  const {
    state,
    phase,
    handAnalysis,
    explanation,
    deal,
    discard,
    newHand,
  } = useSingleHand()

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>麻將新手訓練中心</h1>
          <p className={styles.subtitle}>手牌路線分析 · 台灣麻將 16 張</p>
        </div>
        {state && (
          <NewRoundButton onClick={newHand} label="換一副新的" />
        )}
      </header>

      <main className={styles.main}>
        {phase === 'idle' && (
          <div className={styles.idlePanel}>
            <p>隨機發一副手牌，看看有哪些拆法和發展路線。</p>
            <button type="button" className={styles.dealButton} onClick={deal}>
              發牌
            </button>
          </div>
        )}

        {phase === 'analysis' && state && handAnalysis && (
          <div className={styles.analysisPanel}>
            <RouteComparisonPanel description={state.routeDescription} />
            <HandAnalysisPanel analysis={handAnalysis} />
            <p className={styles.instruction}>
              看完分析後，可以試著選一張牌打出去看回饋。
              <span className={styles.legend}>圈起來的是建議優先捨棄的孤張</span>
            </p>
            <Hand
              hand={state.hand}
              drawnTile={state.drawnTile}
              onDiscard={discard}
              suggestedKinds={handAnalysis.recommendedDiscards}
            />
          </div>
        )}

        {phase === 'feedback' && explanation && (
          <DiscardFeedbackPanel
            explanation={explanation}
            onContinue={newHand}
            continueLabel="換一副新的"
          />
        )}
      </main>
    </div>
  )
}
