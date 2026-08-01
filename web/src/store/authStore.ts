import { create } from "zustand";
import type { RecordModel } from "pocketbase";
import { onAuthChange } from "../lib/auth";

interface AuthState {
  user: RecordModel | null;
}

export const useAuth = create<AuthState>(() => ({ user: null }));

onAuthChange((user) => useAuth.setState({ user }));
