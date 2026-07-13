import styles from './NewRoundButton.module.css'

interface NewRoundButtonProps {
  onClick: () => void
  label?: string
}

export function NewRoundButton({ onClick, label = '再來一局' }: NewRoundButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      {label}
    </button>
  )
}
