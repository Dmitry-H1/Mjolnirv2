import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import logOut from "./logOut";

const API_BASE_URL = "http://127.0.0.1:8000";

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const authFetch: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

authFetch.interceptors.request.use(
  (config: RetryRequestConfig) => {
    const token = localStorage.getItem("access_token");

    if (!config.headers) {
      config.headers = {} as any;
    }

    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

authFetch.interceptors.response.use(
  (response) => response,
  async (err: AxiosError) => {
    const originalRequest = err.config as RetryRequestConfig;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.jwtToken;
        localStorage.setItem("access_token", newAccessToken);

        if (!originalRequest.headers) {
          originalRequest.headers = {} as any;
        }

        (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;

        return authFetch(originalRequest);
      } catch (refreshError) {
        await logOut();
      }
    }

    return Promise.reject(err);
  }
);

export default authFetch;