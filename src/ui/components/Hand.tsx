import { countsToSortedKinds, removeTile } from '../../engine/tiles'
import type { HandCounts, TileKind } from '../../engine/types'
import { Tile } from './Tile'
import styles from './Hand.module.css'

interface HandProps {
  hand: HandCounts
  drawnTile: TileKind | null
  onDiscard?: (kind: TileKind) => void
}

export function Hand({ hand, drawnTile, onDiscard }: HandProps) {
  const concealedCounts = drawnTile !== null ? removeTile(hand, drawnTile) : hand
  const concealedKinds = countsToSortedKinds(concealedCounts)

  return (
    <div className={styles.handRow}>
      <div className={styles.concealed}>
        {concealedKinds.map((kind, i) => (
          <Tile key={i} kind={kind} onClick={onDiscard} />
        ))}
      </div>
      {drawnTile !== null && (
        <div className={styles.drawnSlot}>
          <Tile kind={drawnTile} onClick={onDiscard} highlighted />
        </div>
      )}
    </div>
  )
}
