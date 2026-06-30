import styles from "./Moderation.module.css";

const ModerationCard = ({ item, onApprove, onRemove }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{item.title}</h2>
        <span className={styles.badge}>Pending</span>
      </div>

      <p className={styles.cardBody}>{item.body}</p>

      <div className={styles.cardFooter}>
        <span>User ID: {item.user_id}</span>

        <div className={styles.actions}>
          <button
            className={styles.approveBtn}
            onClick={() => onApprove(item.id)}
          >
            Approve
          </button>

          <button
            className={styles.removeBtn}
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModerationCard;
