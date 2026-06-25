import { useEffect, useState } from "react";
import styles from "./Moderation.module.css";
import axios from "axios";

const Moderation = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchQueue = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3777/api/moderation/queue",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setItems(response.data.data);
    } catch (error) {
      console.error("Failed to load moderation queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await axios.patch(
        `http://localhost:3777/api/moderation/${id}/resolve`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(`Failed to ${action} item:`, error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading moderation queue...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Moderation Dashboard</h1>

      {items.length === 0 ? (
        <p className={styles.empty}>No pending moderation items.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>{item.title}</h2>
              <span className={styles.status}>{item.moderation_status}</span>
            </div>

            <p className={styles.content}>{item.body || item.content}</p>

            <div className={styles.meta}>
              <span>User ID: {item.user_id}</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>

            {item.moderation_reason && (
              <div className={styles.reasonBox}>
                <strong>AI Reason:</strong>
                <p>{item.moderation_reason}</p>
              </div>
            )}

            <div className={styles.actions}>
              <button
                className={styles.approveBtn}
                onClick={() => handleAction(item.id, "approved")}
              >
                Approve
              </button>

              <button
                className={styles.removeBtn}
                onClick={() => handleAction(item.id, "removed")}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Moderation;
