import { create } from "zustand";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

// ✅ Define types for function params
type Email = string;
type Password = string;
type Name = string;

interface AuthState {
  currentUser: User | null;
  loading: boolean;

  // ✅ Explicitly typed function signatures
  signup: (email: Email, password: Password, name: Name) => Promise<void>;
  login: (email: Email, password: Password) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  loading: true,

  signup: async (email, password, name) => {
    try {
      console.log("Starting signup...");
  
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
  
      await updateProfile(user, { displayName: name });
  
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        name,
        createdAt: serverTimestamp(),
      });
  
      set({ currentUser: user });
      
    } catch (error) {
      console.error("Error during signup:", error);
    }
  },
  

  // 🔑 Login an existing user
  login: async (email: Email, password: Password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    set({ currentUser: user });
  },

  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  // 🚪 Logout user
  logout: async () => {
    await signOut(auth);
    set({ currentUser: null });
  },

  // 🔄 Helpers
  setUser: (user) => set({ currentUser: user }),
  setLoading: (loading) => set({ loading }),
}));
