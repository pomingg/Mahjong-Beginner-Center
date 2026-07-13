import styles from './HandAnalysisPanel.module.css'

interface HandAnalysisPanelProps {
  analysis: string
}

export function HandAnalysisPanel({ analysis }: HandAnalysisPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.label}>牌型分析</p>
      <p className={styles.text}>{analysis}</p>
    </div>
  )
}
