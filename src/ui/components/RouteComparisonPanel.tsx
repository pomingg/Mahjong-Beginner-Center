import type { HandRouteDescription, ClusterRouteDescription, RouteDescription } from '../../explain/describeRoutes'
import styles from './RouteComparisonPanel.module.css'

interface RouteComparisonPanelProps {
  description: HandRouteDescription
}

const GROUP_ICON: Record<string, { icon: string; className: string }> = {
  '順子': { icon: '✔', className: styles.meldIcon },
  '刻子': { icon: '✔', className: styles.meldIcon },
  '等': { icon: '○', className: styles.partialIcon },
  '搭子': { icon: '○', className: styles.partialIcon },
  '當將': { icon: '♦', className: styles.pairIcon },
  '浮牌': { icon: '·', className: styles.floaterIcon },
}

function getStepIcon(step: string): { icon: string; className: string } {
  for (const [keyword, info] of Object.entries(GROUP_ICON)) {
    if (step.includes(keyword)) return info
  }
  return { icon: '·', className: styles.floaterIcon }
}

function RouteCard({ route }: { route: RouteDescription }) {
  return (
    <div className={styles.routeCard}>
      <p className={styles.routeTitle}>{route.title}</p>
      <ul className={styles.steps}>
        {route.steps.map((step, i) => {
          const { icon, className } = getStepIcon(step)
          return (
            <li key={i} className={styles.step}>
              <span className={`${styles.stepIcon} ${className}`}>{icon}</span>
              {step}
            </li>
          )
        })}
      </ul>
      <p className={styles.routeSummary}>{route.summary}</p>
    </div>
  )
}

function ClusterSection({ cluster }: { cluster: ClusterRouteDescription }) {
  const isSingle = cluster.routes.length <= 1
  return (
    <div className={`${styles.clusterSection} ${isSingle ? styles.singleRoute : ''}`}>
      <p className={styles.clusterTitle}>{cluster.clusterLabel}</p>
      <div className={styles.routeGrid}>
        {cluster.routes.map((route, i) => (
          <RouteCard key={i} route={route} />
        ))}
      </div>
      {cluster.comparison && (
        <p className={styles.comparison}>{cluster.comparison}</p>
      )}
    </div>
  )
}

export function RouteComparisonPanel({ description }: RouteComparisonPanelProps) {
  const meaningfulClusters = description.clusters.filter(
    (c) => c.routes.length > 0 && c.routes.some((r) => r.steps.length > 0),
  )

  if (meaningfulClusters.length === 0) return null

  return (
    <div className={styles.panel}>
      <p className={styles.label}>路線分析</p>
      {meaningfulClusters.map((cluster, i) => (
        <ClusterSection key={i} cluster={cluster} />
      ))}
      {description.pairTension && (
        <p className={styles.pairTension}>{description.pairTension}</p>
      )}
    </div>
  )
}
