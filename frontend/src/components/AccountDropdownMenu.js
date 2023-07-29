import React from "react";
import "../styles/Global.css";
import "../styles/Navbar.css";
import AccountDropdownLink from "./AccountDropdownLink";

export default function AccountDropdownMenu({
  dropdownMenuRef,
  hideAccountDropdown,
  animateDropdown,
  joinedDate,
}) {
  const dateString = joinedDate.split(" ");
  const month = dateString[1];
  const day = dateString[2];
  const year = dateString[3];

  return (
    <div
      className={`dropdownContent ${hideAccountDropdown ? "hidden" : ""} ${
        animateDropdown ? "activateAnimation" : ""
      }`}
      ref={dropdownMenuRef}
    >
      <div className="dropdownProfileDetails">
        <div className="profileDetailsRow">
          <p className="profileDetailsLabel">Credits:</p>
          {/* TODO: redux */}
          <p className="profileDetailsValue">{"$100.00"}</p>
        </div>
        <div className="profileDetailsRow">
          <p className="profileDetailsLabel">Members since:</p>
          <p className="profileDetailsValue">{`${month} ${day}, ${year}`}</p>
        </div>
      </div>

      <hr />

      <AccountDropdownLink
        type="account"
        text="Account settings"
        link="/accountsettings"
      />
      <AccountDropdownLink
        type="load"
        text="Load credits"
        link="/loadcredits"
      />
      <AccountDropdownLink
        type="history"
        text="Credit history"
        link="/creditshistory"
      />
      <AccountDropdownLink type="logout" text="Logout" link="/" />
    </div>
  );
}
