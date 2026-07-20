import type { HandAnalysis, ClusterSummary } from '../../explain/analyzeHand'
import styles from './HandAnalysisPanel.module.css'

interface HandAnalysisPanelProps {
  analysis: HandAnalysis
}

const STATUS_ICON: Record<ClusterSummary['status'], string> = {
  complete: '✔',
  developing: '○',
  isolated: '·',
}

const STATUS_CLASS: Record<ClusterSummary['status'], string> = {
  complete: styles.statusComplete,
  developing: styles.statusDeveloping,
  isolated: styles.statusIsolated,
}

export function HandAnalysisPanel({ analysis }: HandAnalysisPanelProps) {
  const { progress, clusters, tensions, suggestion } = analysis
  if (!progress) return null

  return (
    <div className={styles.panel}>
      <p className={styles.label}>牌型分析</p>
      <p className={styles.progress}>{progress}</p>

      {clusters.length > 0 && (
        <div className={styles.clusterSection}>
          {clusters.map((cluster, i) => (
            <div key={i} className={`${styles.cluster} ${STATUS_CLASS[cluster.status]}`}>
              <span className={styles.clusterLabel}>
                <span className={styles.statusIcon}>{STATUS_ICON[cluster.status]}</span>
                {cluster.label}
              </span>
              {cluster.branches.length > 0 && (
                <ul className={styles.branches}>
                  {cluster.branches.map((branch, j) => (
                    <li key={j}>{branch}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {tensions.length > 0 && (
        <div className={styles.tensions}>
          {tensions.map((t, i) => (
            <p key={i} className={styles.tension}>{t}</p>
          ))}
        </div>
      )}

      {suggestion && <p className={styles.suggestion}>{suggestion}</p>}
    </div>
  )
}
