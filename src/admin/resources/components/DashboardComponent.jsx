
import React from "react";

const DashboardComponent = (props) => {
  const data = props.data || {};
  console.log('the data is ', data);
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>لوحة التحكم</h1>

      <div style={styles.cardsContainer}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>إجمالي المستخدمين</h2>
          <p style={styles.cardNumber}>{data.usersCount}</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>إجمالي الهدايا</h2>
          <p style={styles.cardNumber}>{data.giftsCount}</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "30px",
    direction: "rtl",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "25px",
  },
  cardsContainer: {
    display: "flex",
    gap: "20px",
  },
  card: {
    flex: 1,
    // background: "#fff",
    padding: "25px",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "10px",
  },
  cardNumber: {
    fontSize: "50px",
    fontWeight: "bold",
    color: "#357637ff",
  },
};

export default DashboardComponent;
