import React from "react";
import { FaCheckCircle } from "react-icons/fa";

export default function OrderSuccess({ formValues }) {
  function orderSummaryItem(label, value) {
    return (
      <div className="orderSummaryRow">
        <p>{label}</p>
        <p>
          <strong>{value || "N/A"}</strong>
        </p>
      </div>
    );
  }

  function renderContactInfo(title, info) {
    return (
      <>
        <h3>{title}</h3>
        {Object.entries(info).map(([label, value]) =>
          orderSummaryItem(label, value)
        )}
      </>
    );
  }

  function orderSummary() {
    const { courier, classType, packageInfo, senderInfo, recipientInfo } =
      formValues;
    return (
      <div className="orderSummary">
        <h2>Order Summary</h2>
        <div className="orderSummarySection">
          <h3>Courier and Class</h3>
          {orderSummaryItem("Courier", courier)}
          {orderSummaryItem("Class", classType)}
        </div>
        <div className="orderSummarySection">
          <h3>Package Details</h3>
          {Object.entries(packageInfo).map(([label, value]) =>
            orderSummaryItem(label, value)
          )}
        </div>
        <div className="orderSummarySection">
          {renderContactInfo("Sender Information", senderInfo)}
        </div>
        <div className="orderSummarySection">
          {renderContactInfo("Recipient Information", recipientInfo)}
        </div>
      </div>
    );
  }

  return (
    <div className="globalContainer orderLabelContainer">
      <div className="headingContainer">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        >
          <FaCheckCircle size={80} color="#00cc66" />
        </div>
        <h1>Thank you for your Order!</h1>
        <p>You will recieve an email of your order details.</p>
      </div>
      {orderSummary()}
    </div>
  );
}