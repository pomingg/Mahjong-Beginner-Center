import { NewRoundButton } from './NewRoundButton'
import styles from './RoundSummaryModal.module.css'

interface RoundSummaryModalProps {
  status: 'won' | 'drawn'
  totalTurns: number
  optimalTurns: number
  onNewRound: () => void
}

export function RoundSummaryModal({
  status,
  totalTurns,
  optimalTurns,
  onNewRound,
}: RoundSummaryModalProps) {
  const rate = totalTurns === 0 ? 0 : Math.round((optimalTurns / totalTurns) * 100)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{status === 'won' ? '🀄 自摸！' : '流局'}</h2>
        <p className={styles.stat}>
          本局共 {totalTurns} 次出牌，其中 {optimalTurns} 次選到最佳解（{rate}%）
        </p>
        <NewRoundButton onClick={onNewRound} />
      </div>
    </div>
  )
}
