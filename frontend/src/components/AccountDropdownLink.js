import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaUserEdit,
  FaChevronRight,
  FaHistory,
  FaMoneyCheckAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import axios from "../api/axios";
import { clearSession } from "../redux/actions/UserAction";
import "../styles/Global.css";
import "../styles/Navbar.css";
import Log from "./Log";

export default function AccountDropdownLink({ type, link, text }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function renderIcon() {
    switch (type) {
      case "account":
        return <FaUserEdit />;
      case "load":
        return <FaMoneyCheckAlt />;
      case "history":
        return <FaHistory />;
      case "logout":
        return <FaSignOutAlt />;
      default:
        return null;
    }
  }

  return (
    <div
      className="dropdownLink"
      onClick={async (e) => {
        e.preventDefault();
        if (type === "logout") {
          await axios
            .get("/auth/logout", { withCredentials: true })
            .then((res) => Log(res))
            .catch((err) => Log("Error: ", err))
            .finally(() => dispatch(clearSession()));
        }
        navigate(link);
      }}
    >
      <div>
        {renderIcon()}
        <p className="dropdownNavLink">{text}</p>
      </div>
      <FaChevronRight />
    </div>
  );
}
