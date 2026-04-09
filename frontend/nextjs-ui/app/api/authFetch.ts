import axios from "axios";
import { API_BASE_URL } from "../constants";
import logOut from "./authentication/logOut";


const authFetch = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

authFetch.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

authFetch.interceptors.response.use(
  (response) => response,
  async (error) => {

    const originalRequest = error.config

    if (error.response?.status == 401 && !originalRequest._retry) {

        originalRequest._retry = true

        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {withCredentials: true});
          const newAccessToken = response.data.access_token;

          localStorage.setItem("access_token", newAccessToken);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccessToken}`,
          };

        return axios(originalRequest);

        } catch (refreshError) {
            await logOut()
        }

    }

    return Promise.reject(error);
  }
);

export default authFetch;