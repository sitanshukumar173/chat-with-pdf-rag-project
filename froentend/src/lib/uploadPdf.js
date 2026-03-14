import { API_BASE } from "../constants/app";

export function uploadPdf(file, onProgress, token = "", chatId = "") {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    if (chatId) {
      formData.append("chatId", chatId);
    }

    const uploadPath = token ? "/api/v1/upload/user" : "/api/v1/upload";

    xhr.open("POST", `${API_BASE}${uploadPath}`);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress(percent);
    };

    xhr.onload = () => {
      const payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.message || "Failed to upload PDF"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading PDF"));
    xhr.send(formData);
  });
}
