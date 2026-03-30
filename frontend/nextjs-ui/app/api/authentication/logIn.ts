import axios, { AxiosError } from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const logIn = async (
  username: string,
  password: string,
  setError: (msg: string) => void
): Promise<number | void> => {
  if (!username || !password) {
    setError("Please enter both username and password.");
    return;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      { username, password },
      { withCredentials: true }
    );

    localStorage.setItem("access_token", response.data.access_token);

    console.log(`Successful authentication of user: ${username}`);

    return response.status;
  } catch (err) {
    const error = err as AxiosError;

    if (error.response?.status === 401) {
      setError("Wrong Username or Password");
      return error.response?.status;
    }

    setError("Login failed");
    return error.response?.status;
  }
};

export default logIn;