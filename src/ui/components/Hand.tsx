import { countsToSortedKinds, removeTile } from '../../engine/tiles'
import type { HandCounts, TileKind } from '../../engine/types'
import { Tile } from './Tile'
import styles from './Hand.module.css'

interface HandProps {
  hand: HandCounts
  drawnTile: TileKind | null
  onDiscard?: (kind: TileKind) => void
  /** 建議優先捨棄的孤張牌種，會在手牌上加提示環 */
  suggestedKinds?: TileKind[]
  /** 玩家這一題選擇捨棄的牌種，會加上標記；通常搭配不傳 onDiscard 做純顯示 */
  discardedKind?: TileKind | null
}

export function Hand({ hand, drawnTile, onDiscard, suggestedKinds = [], discardedKind = null }: HandProps) {
  const concealedCounts = drawnTile !== null ? removeTile(hand, drawnTile) : hand
  const concealedKinds = countsToSortedKinds(concealedCounts)
  const suggested = new Set(suggestedKinds)

  return (
    <div className={styles.handRow}>
      <div className={styles.concealed}>
        {concealedKinds.map((kind, i) => (
          <Tile
            key={i}
            kind={kind}
            onClick={onDiscard}
            suggested={suggested.has(kind)}
            discarded={kind === discardedKind}
          />
        ))}
      </div>
      {drawnTile !== null && (
        <div className={styles.drawnSlot}>
          <Tile
            kind={drawnTile}
            onClick={onDiscard}
            highlighted
            suggested={suggested.has(drawnTile)}
            discarded={drawnTile === discardedKind}
          />
        </div>
      )}
    </div>
  )
}
