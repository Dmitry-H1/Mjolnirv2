import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const serverAuthFetch = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send cookies to backend
  headers: { "Content-Type": "application/json" },
});

export default serverAuthFetch;