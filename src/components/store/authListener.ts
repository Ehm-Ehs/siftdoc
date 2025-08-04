import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "./useAuthStore";
import { auth } from "../lib/firebase";


export function initAuthListener() {
  const { setUser, setLoading } = useAuthStore.getState();

  onAuthStateChanged(auth, (user) => {
    setUser(user);
    setLoading(false);
  });
}
