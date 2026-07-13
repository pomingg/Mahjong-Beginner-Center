import { getTileGlyph, getTileLabel } from '../../engine/tileLabels'
import { kindToSuit } from '../../engine/tiles'
import type { TileKind } from '../../engine/types'
import styles from './Tile.module.css'

interface TileProps {
  kind: TileKind
  onClick?: (kind: TileKind) => void
  highlighted?: boolean
  disabled?: boolean
}

export function Tile({ kind, onClick, highlighted = false, disabled = false }: TileProps) {
  const { main, suitMark } = getTileGlyph(kind)
  const suit = kindToSuit(kind)
  const label = getTileLabel(kind)

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

  const classNames = [styles.tile, highlighted ? styles.highlighted : '', disabled ? styles.disabled : '']
    .filter(Boolean)
    .join(' ')

  if (!onClick || disabled) {
    return (
      <div className={classNames} role="img" aria-label={label}>
        {face}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${classNames} ${styles.clickable}`}
      onClick={() => onClick(kind)}
      aria-label={`打出${label}`}
    >
      {face}
    </button>
  )
}
