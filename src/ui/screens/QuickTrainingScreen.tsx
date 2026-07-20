import { suggestedDiscardKinds } from '../../explain/analyzeHand'
import { DiscardFeedbackPanel } from '../components/DiscardFeedbackPanel'
import { Hand } from '../components/Hand'
import { useQuickTraining } from '../hooks/useQuickTraining'
import styles from './QuickTrainingScreen.module.css'

const DIFFICULTY_OPTIONS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
]

export function QuickTrainingScreen() {
  const { question, phase, explanation, stats, difficulty, start, discard, next, changeDifficulty } =
    useQuickTraining()

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>麻將出牌練習</h1>
          <p className={styles.subtitle}>台灣麻將 16 張 · 快問快答</p>
        </div>
      </header>

      <section className={styles.difficultyBar}>
        <span className={styles.difficultyLabel}>離聽牌的距離</span>
        <div className={styles.difficultyButtons}>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.difficultyBtn} ${difficulty === opt.value ? styles.active : ''}`}
              onClick={() => changeDifficulty(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {!question && (
        <div className={styles.startPanel}>
          <p className={styles.startHint}>
            選好難度後按「開始練習」，每題會發一副手牌讓你練習取捨。
          </p>
          <button type="button" className={styles.startButton} onClick={start}>
            開始練習
          </button>
        </div>
      )}

      {question && (
        <>
          <section className={styles.statsBar}>
            <span>
              已練 <strong>{stats.total}</strong> 題
            </span>
            <span className={styles.statDivider} />
            <span>
              最佳 <strong>{stats.optimal}</strong>
            </span>
            <span className={styles.statDivider} />
            <span>
              正確率{' '}
              <strong>{stats.total > 0 ? Math.round((stats.optimal / stats.total) * 100) : 0}%</strong>
            </span>
            {stats.streak >= 2 && (
              <span className={styles.streak}>
                連續 {stats.streak} 題最佳
              </span>
            )}
          </section>

          {phase === 'choosing' && (
            <section className={styles.questionPanel}>
              <p className={styles.instruction}>
                摸到一張新牌（右側），選一張要打出的牌
                <span className={styles.legend}>圈起來的牌是建議優先捨棄的</span>
              </p>
              <Hand
                hand={question.hand}
                drawnTile={question.drawnTile}
                onDiscard={discard}
                suggestedKinds={suggestedDiscardKinds(question.evaluations)}
              />
            </section>
          )}

          {phase === 'feedback' && explanation && (
            <section className={styles.feedbackPanel}>
              <DiscardFeedbackPanel
                explanation={explanation}
                onContinue={next}
                continueLabel="下一題"
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
