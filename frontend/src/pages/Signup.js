import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { GoArrowLeft } from "react-icons/go";
import axios from "../api/axios";
import "../styles/Global.css";
import "../styles/Auth.css";
import Button from "../components/Button";
import { InputField, PasswordField } from "../components/Field";
import PageLayout from "../components/PageLayout";
import AlertMessage from "../components/AlertMessage";
import {
  setUserEmail,
  setUserJoinedDate,
  setUserLoggedIn,
  setUserName,
} from "../redux/actions/UserAction";

export default function Signup() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [inputUserName, setInputUserName] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState({
    length: true,
    uppercase: true,
    number: true,
    specialChar: true,
  });

  useEffect(() => {
    if (isLoggedIn) window.location.href = "/verifyemail";
  }, [isLoggedIn]);

  // Validate password field during input change
  function validatePasswordOnTyping(password) {
    const passwordValid = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*()\-_=+{}[\]|\\;:'",.<>/?`~]/.test(password),
    };
    setPasswordValid(passwordValid);
  }

  // Validate all fields before submitting
  function validateFields() {
    // regex
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    const emailRegex = /^([a-z0-9_.+-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/g;
    const passwordRegex =
      /^(?=.*[0-9])(?=.*[!@#$%^&*()\-_=+{}[\]|\\;:'",.<>/?`~])(?=.*[A-Z])(?=.*[a-z]).*$/;

    if (inputUserName === "" || inputEmail === "" || inputPassword === "") {
      setErrMsg("All fields are required.");
      return false;
    }

    // username validation
    if (inputUserName.length < 3 || inputUserName.length > 15) {
      setErrMsg("Username must be between 3 and 15 characters.");
      return false;
    } else if (!usernameRegex.test(inputUserName)) {
      setErrMsg(
        "Invalid username. Only alphabets, numbers, dash, underscores, and periods are allowed."
      );
      return false;
    }

    // email validation
    if (inputEmail.length < 3 || inputEmail.length > 100) {
      setErrMsg("Email must be between 3 and 100 characters.");
      return false;
    } else if (!emailRegex.test(inputEmail)) {
      setErrMsg("Invalid email.");
      return false;
    }

    // password validation
    if (inputPassword.length < 8 || inputPassword.length > 50) {
      setErrMsg("Password must be between 8 and 50 characters.");
      return false;
    } else if (!passwordRegex.test(inputPassword)) {
      setErrMsg(
        "Password must contain at least one uppercase letter, one number, and one special character."
      );
      return false;
    }
    return true;
  }

  function getCurrenDateInPST() {
    const date = new Date();
    date.toLocaleString("en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "America/Vancouver",
    });
    return date.toISOString();
  }

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateFields()) {
      setLoading(false);
      return;
    }

    axios
      .post(
        "/Signup",
        { userName: inputUserName, email: inputEmail, password: inputPassword },
        { withCredentials: true }
      )
      .then((res) => {
        console.log(res);
        if (res.data.errMsg) setErrMsg(res.data.errMsg);
        else {
          dispatch(setUserName(inputUserName));
          dispatch(setUserJoinedDate(getCurrenDateInPST()));
          dispatch(setUserEmail(inputEmail));
          dispatch(setUserLoggedIn(true));
        }
      })
      .catch((e) => {
        console.log("Error: ", e);
        setErrMsg(`${e.name}: ${e.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <PageLayout title="Sign Up" hideNavAndFooter>
      <div className="authContainer">
        <div className="authColumn">
          <div className="backToHome">
            <Link to="/" className="link">
              <GoArrowLeft size={18} style={{ marginTop: "2px" }} />
              <p>Return to Home</p>
            </Link>
          </div>
          <div className="authHeader">
            <h1>Create an account</h1>
            <p>Let's get started with a free account.</p>
          </div>
          {errMsg && <AlertMessage msg={errMsg} type="error" />}
          <form action="POST" className="authFormContainer">
            <InputField
              onChangeEvent={(e) => {
                setInputUserName(e.target.value);
                setErrMsg("");
              }}
              placeholder="Username"
              minLength={3}
              maxLength={15}
            />
            <InputField
              fieldType="email"
              onChangeEvent={(e) => {
                setInputEmail(e.target.value);
                setErrMsg("");
              }}
              placeholder="Email"
              minLength={3}
              maxLength={100}
            />
            <PasswordField
              onChangeEvent={(e) => {
                setInputPassword(e.target.value);
                validatePasswordOnTyping(e.target.value);
                setErrMsg("");
              }}
              placeholder="Password"
              minLength={8}
              maxLength={50}
            />
            <div className="passwordRequirements">
              <p>Password must include:</p>
              <ul>
                <li className={passwordValid.length ? "" : "invalidPassword"}>
                  At least 8 characters
                </li>
                <li
                  className={passwordValid.uppercase ? "" : "invalidPassword"}
                >
                  At least 1 uppercase letter
                </li>
                <li className={passwordValid.number ? "" : "invalidPassword"}>
                  At least 1 number
                </li>
                <li
                  className={passwordValid.specialChar ? "" : "invalidPassword"}
                >
                  At least 1 special character
                </li>
              </ul>
            </div>
            <Button
              btnType="submit"
              onClickEvent={submit}
              loading={loading}
              text="Create account"
            />
            <p className="disclaimer">
              By signing up to create an account I accept KEMLabel's{" "}
              <Link className="link" target="_blank" to="/termsandconditions">
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link className="link" target="_blank" to="/privacypolicy">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
          <div style={{ width: "100%", textAlign: "center" }}>
            <span style={{ opacity: 0.5 }}>Already have an account? </span>
            <Link to="/signin" className="link">
              Sign In
            </Link>
          </div>
        </div>
        <div className="authColumn">
          <img
            src="/media/signup.jpg"
            width="100%"
            alt="Illustration of a man signing up by unlocking lock with a key."
          />
        </div>
      </div>
    </PageLayout>
  );
}
