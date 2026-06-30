import { useEffect, useState } from "react";
import styles from "./ModerationPage.module.css";

import {
  getModerationQueue,
  resolveModerationItem,
} from "../../services/moderation/moderationService.js";

import ModerationCard from "../../components/Moderation/Moderation.jsx"

const ModerationPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem("token");

      const result = await getModerationQueue(token);
      setItems(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     console.log("FETCH RUNNING");
    fetchQueue();
  }, []);

  const approveItem = async (id) => {
    try {
      await resolveModerationItem(id, "approved", token);
      fetchQueue();
    } catch (error) {
      console.error(error);
    }
  };

  const removeItem = async (id) => {
    try {
      await resolveModerationItem(id, "removed", token);
      fetchQueue();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return (
    <div className={styles.container}>
      <h1>Moderation Dashboard</h1>

      {items.length === 0 ? (
        <p>No pending moderation items</p>
      ) : (
        items.map((item) => (
          <ModerationCard
            key={item.id}
            item={item}
            onApprove={approveItem}
            onRemove={removeItem}
          />
        ))
      )}
    </div>
  );
};

export default ModerationPage;
