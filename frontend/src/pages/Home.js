import React, { useEffect } from "react";
import "../styles/Global.css";
import "../styles/Home.css";
import PageLayout from "../components/PageLayout";
import Accordion from "../components/Accordion";
import FaqJson from "../content/faq";
import axios from "../api/axios";

export default function Home() {
  useEffect(() => {
    axios
      .get("/getSessionInfo", { withCredentials: true })
      .then((res) => {
        if (res.data.isLoggedIn) {
          axios
            .get("/checkVerification", { withCredentials: true })
            .then((res) => {
              if (res.data.errMsg) {
                window.location.href = "/verifyEmail";
              }
            })
            .catch((err) => console.log(err));
        }
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <PageLayout isLandingPage>
      <div id="home" className="hero">
        <div className="heroColumn">
          <h1>Shipping Made Simple</h1>
          <p>Fast, Reliable Shipping Delivered to Your Doorstep!</p>
        </div>
        <div className="heroColumn">
          <img
            src="/media/hero.svg"
            width="100%"
            alt="Illustration of a delivery man."
          />
        </div>
      </div>
      <div id="faq">
        <h1>Frequently Asked Questions</h1>
        <Accordion value={FaqJson}></Accordion>
      </div>
    </PageLayout>
  );
}
