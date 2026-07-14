import { getTileGlyph, getTileLabel } from '../../engine/tileLabels'
import { kindToSuit } from '../../engine/tiles'
import type { TileKind } from '../../engine/types'
import styles from './Tile.module.css'

interface TileProps {
  kind: TileKind
  onClick?: (kind: TileKind) => void
  highlighted?: boolean
  disabled?: boolean
  /** 標示為「建議優先捨棄的孤張」，在牌外圍加上柔和提示環 */
  suggested?: boolean
}

export function Tile({
  kind,
  onClick,
  highlighted = false,
  disabled = false,
  suggested = false,
}: TileProps) {
  const { main, suitMark } = getTileGlyph(kind)
  const suit = kindToSuit(kind)
  const label = getTileLabel(kind)
  const ariaLabel = suggested ? `${label}（建議捨）` : label

  const face = (
    <svg viewBox="0 0 48 64" className={styles.svg} aria-hidden="true">
      <g className={styles[suit]}>
        <rect x="2" y="2" width="44" height="60" rx="6" className={styles.face} />
        <text x="24" y={suitMark ? 32 : 38} textAnchor="middle" className={styles.mainGlyph}>
          {main}
        </text>
        {suitMark && (
          <text x="24" y="50" textAnchor="middle" className={styles.suitGlyph}>
            {suitMark}
          </text>
        )}
      </g>
    </svg>
  )

  const classNames = [
    styles.tile,
    highlighted ? styles.highlighted : '',
    disabled ? styles.disabled : '',
    suggested ? styles.suggested : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (!onClick || disabled) {
    return (
      <div className={classNames} role="img" aria-label={ariaLabel}>
        {face}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${classNames} ${styles.clickable}`}
      onClick={() => onClick(kind)}
      aria-label={`打出${ariaLabel}`}
    >
      {face}
    </button>
  )
}
