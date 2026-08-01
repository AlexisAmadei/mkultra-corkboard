import type { RecordModel } from "pocketbase";
import { pb, usersApi } from "./pocketbase";

export function currentUser(): RecordModel | null {
  return pb.authStore.record;
}

export function isLoggedIn(): boolean {
  return pb.authStore.isValid;
}

export async function loginWithPassword(email: string, password: string) {
  await usersApi.authWithPassword(email, password);
}

export async function signup(email: string, password: string, name: string) {
  await usersApi.create({
    email,
    password,
    passwordConfirm: password,
    name,
    // Needed so other users can find this account by email when inviting
    // collaborators (PocketBase hides `email` by default otherwise).
    emailVisibility: true,
  });
  await loginWithPassword(email, password);
}

export interface OAuthProvider {
  name: string;
  displayName: string;
}

export async function listAuthProviders(): Promise<OAuthProvider[]> {
  const methods = await usersApi.listAuthMethods();
  return (methods.oauth2?.providers ?? []).map((p) => ({
    name: p.name,
    displayName: p.displayName,
  }));
}

export async function loginWithOAuth2(providerName: string) {
  await usersApi.authWithOAuth2({ provider: providerName });
}

export async function changePassword(
  oldPassword: string,
  password: string,
  passwordConfirm: string,
) {
  const id = pb.authStore.record!.id;
  await usersApi.update(id, { oldPassword, password, passwordConfirm });
}

export function logout() {
  pb.authStore.clear();
}

/** Subscribe to auth changes (login/logout/token refresh) for reactive UI. */
export function onAuthChange(cb: (user: RecordModel | null) => void) {
  return pb.authStore.onChange((_token, record) => cb(record), true);
}
