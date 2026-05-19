// components/GroupList.jsx
import styles from './GroupList.module.css'

export default function GroupList({ groups, selectedGroup, onSelectGroup, onDeleteGroup }) {
  return (
    <div className={styles.groupList}>
      {groups.length === 0 ? (
        <div className={styles.emptyList}>No groups yet</div>
      ) : (
        groups.map(group => (
          <div
            key={group.id}
            className={`${styles.groupItem} ${selectedGroup?.id === group.id ? styles.active : ''}`}
            onClick={() => onSelectGroup(group)}
          >
            <div className={styles.groupContent}>
              <div className={styles.groupName}>{group.name}</div>
              <div className={styles.groupMeta}>
                {group.memberCount} members
              </div>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteGroup(group.id)
              }}
              title="Delete group"
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  )
}
