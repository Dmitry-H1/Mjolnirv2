import axios, { AxiosError } from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";
const APP_BASE_URL = "http://localhost:3000";

const logOut = async (): Promise<number | void> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = `${APP_BASE_URL}/`;

    return response.status;
  } catch (err) {
    const error = err as AxiosError;
    console.log(error.response?.data);
  }

  return;
};

export default logOut;