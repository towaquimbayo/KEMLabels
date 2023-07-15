import React, {useEffect, useState} from 'react';
import axios from "../api/axios";
import "../styles/Global.css";
import "../styles/Home.css";
import Navbar from "../components/Navbar";

export default function Home() {
  const [userData, setUserData] = useState(null);
  useEffect(() => {
    axios.get('/getSessionInfo', {withCredentials: true})
        .then(res => {
          displayEmail();
        })
        .catch(err => console.log(err))
    const displayEmail = () => {
      axios.get('/getUserData', {withCredentials: true})
      .then(res => {
        setUserData(res.data.userData);
      })
      .catch(err=> console.log(err))
    }
}, [])

  return (
    <div>
      <Navbar />
      <div className="wrapper">
        <header className="header">
          <h1>Welcome</h1>
          {userData && <h2>Your email address is {userData.email}</h2>}
        </header>
        <main className="main-content">
          {/* Rest of your content goes here */}
        </main>
      </div>
    </div>
  );
}