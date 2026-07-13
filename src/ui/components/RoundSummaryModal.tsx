import { NewRoundButton } from './NewRoundButton'
import styles from './RoundSummaryModal.module.css'

interface RoundSummaryModalProps {
  status: 'won' | 'drawn'
  totalTurns: number
  optimalTurns: number
  keptTurns: number
  regressedTurns: number
  onNewRound: () => void
}

function encouragement(keptRate: number, totalTurns: number): string {
  if (totalTurns === 0) return '這局沒有出到牌。'
  if (keptRate >= 90) return '牌型效率抓得很穩，繼續保持！'
  if (keptRate >= 70) return '大方向不錯，再多留意進張最寬的選擇。'
  if (keptRate >= 50) return '基礎有了，練習判斷哪些牌會讓向聽退步。'
  return '別氣餒，先從「不要拆掉已成形的面子和搭子」開始練。'
}

export function RoundSummaryModal({
  status,
  totalTurns,
  optimalTurns,
  keptTurns,
  regressedTurns,
  onNewRound,
}: RoundSummaryModalProps) {
  const keptRate = totalTurns === 0 ? 0 : Math.round((keptTurns / totalTurns) * 100)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{status === 'won' ? '🀄 自摸！' : '流局'}</h2>
        <p className={styles.stat}>
          本局共 {totalTurns} 次出牌，其中 {keptTurns} 次維持住向聽（合格率 {keptRate}%）。
        </p>
        <ul className={styles.breakdown}>
          <li>
            <span className={styles.dotGood} />最佳解 {optimalTurns} 次
          </li>
          <li>
            <span className={styles.dotOk} />維持向聽 {keptTurns - optimalTurns} 次
          </li>
          <li>
            <span className={styles.dotBad} />退向聽 {regressedTurns} 次
          </li>
        </ul>
        <p className={styles.encourage}>{encouragement(keptRate, totalTurns)}</p>
        <NewRoundButton onClick={onNewRound} />
      </div>
    </div>
  )
}
