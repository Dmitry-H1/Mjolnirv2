import axios from "axios";
import { API_BASE_URL } from "../../constants";

export default async function logOut(): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
  } catch {
    // ignore errors on logout
  }
  localStorage.removeItem("access_token");
  window.location.replace("/login");
}
