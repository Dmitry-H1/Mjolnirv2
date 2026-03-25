import axios, { AxiosError } from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const signUp = async (
  username: string,
  password: string,
  setError: (msg: string) => void
): Promise<number | void> => {
  if ( !username || !password ) {
    setError("Please fill in all fields.");
    return;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      { username, password },
      { withCredentials: true }
    );

    localStorage.setItem("access_token", response.data?.jwtToken);
    console.log(`Successful registration of user: ${username}`);

    return response.status;
  } catch (err) {
    const error = err as AxiosError;

    if (error.response?.status === 409) {
      setError("Username already exists"); 
      return error.response?.status;
    }

    setError("Could not register");
    return error.response?.status;
  }
};

export default signUp;