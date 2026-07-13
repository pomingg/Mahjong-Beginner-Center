import type { DiscardExplanation } from '../../explain/explainDiscard'
import styles from './DiscardFeedbackPanel.module.css'

interface DiscardFeedbackPanelProps {
  explanation: DiscardExplanation
  onContinue: () => void
  continueLabel: string
}

export function DiscardFeedbackPanel({
  explanation,
  onContinue,
  continueLabel,
}: DiscardFeedbackPanelProps) {
  return (
    <div className={`${styles.panel} ${explanation.isOptimal ? styles.optimal : styles.suboptimal}`}>
      <p className={styles.headline}>{explanation.headline}</p>
      <p className={styles.detail}>{explanation.detail}</p>
      <button type="button" className={styles.continueButton} onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  )
}
