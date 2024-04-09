import React, { useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";
import axios from "../api/axios";
import Log from "./Log";
import Button from "./Button";
import AlertMessage from "./AlertMessage";

export default function BulkOrder({
  email,
  fieldErrors,
  setFieldErrors,
  setSectionErrors,
  setOrderSuccess,
  setSuccessMsg,
}) {
  const [isFileDragEnter, setIsFileDragEnter] = useState(false);
  const [bulkOrderFile, setBulkOrderFile] = useState(null);

  function handleFileDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(true);
  }

  function handleFileDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(false);
  }

  function handleFileDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragEnter(true);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setFieldErrors({});
    setIsFileDragEnter(false);
    handleFileUpload(e.dataTransfer.files[0]);
  }

  function handleFileUpload(file) {
    setFieldErrors({});
    if (file.size > 2097152) {
      setFieldErrors((prev) => ({
        ...prev,
        bulkOrderFile: "File size exceeds 2MB. Please upload a smaller file.",
      }));
      return;
    }
    if (file.type !== "text/xlsx") {
      setFieldErrors((prev) => ({
        ...prev,
        bulkOrderFile: "Invalid file format. Please upload a XLSX file.",
      }));
      return;
    }
    setBulkOrderFile(file);
  }

  function submitBulkOrder() {
    if (!bulkOrderFile) {
      setSectionErrors({ container: "Please select a file to upload." });
      return;
    }

    const formData = new FormData();
    formData.append("file", bulkOrderFile);
    formData.append("email", email);
    formData.append("withCredentials", true);

    const axiosConfig = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    axios
      .post("/orderLabelBulk", formData, axiosConfig)
      .then((res) => {
        if (res.data.errMsg) {
          setSectionErrors({ container: res.data.errMsg });
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setSectionErrors({});
          setSuccessMsg("Your order has been placed. Redirecting...");
          setTimeout(() => {
            setOrderSuccess(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 1000);
        }
      })
      .catch((e) => {
        Log("Error: ", e);
        setSectionErrors({
          container: "An unexpected error occurred. Please try again later.",
        }); // Axios default error
      });
  }

  return (
    <div id="bulkOrderContainer">
      {bulkOrderFile ? (
        <>
          <div className="bulkOrderTemplate">
            <div className="instructions">
              <div className="instructionHeading">
                <img src="./media/excel-logo.png" alt="Excel Logo" />
                <h2>{bulkOrderFile.name}</h2>
              </div>
              <p>
                File uploaded successfully. Please click the button below to
                confirm your bulk order.
              </p>
            </div>
            <div className="removeFileContainer">
              <input
                type="button"
                title="Remove file for submission"
                onClick={() => setBulkOrderFile(null)}
                value="Remove"
              />
            </div>
          </div>
          <div className="bulkOrderSubmit">
            <Button
              text="Submit order"
              title="Submit order"
              onClickEvent={submitBulkOrder}
              customStyle={{ margin: "1.5rem auto" }}
            />
          </div>
        </>
      ) : (
        <div>
          {fieldErrors?.bulkOrderFile && (
            <AlertMessage msg={fieldErrors.bulkOrderFile} type="error" />
          )}
          <div
            className={`dragdropContainer ${isFileDragEnter ? "active" : ""}`}
            onDragOver={handleFileDragOver}
            onDragEnter={handleFileDragEnter}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
          >
            <label htmlFor="fileInput" title="Select a file to upload">
              <IoCloudUploadOutline />
              <p>
                Drag and Drop file here or <span>Choose File</span>
              </p>
            </label>
            <input
              id="fileInput"
              type="file"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
          </div>
        </div>
      )}
      <div className="dragDropFooter">
        <p>Supported formats: XLSX</p>
        <p>Max file size: 2MB</p>
      </div>
      <div className="bulkOrderTemplate">
        <div className="instructions">
          <div className="instructionHeading">
            <img src="./media/excel-logo.png" alt="Excel Logo" />
            <h2>Table Template</h2>
          </div>
          <p>
            You can download the attached template and use it as a starting
            point to fill in your bulk order details.
          </p>
        </div>
        <a href="./media/kemlabels-bulk-order-template.xlsx" download>
          Download
        </a>
      </div>
    </div>
  );
}
