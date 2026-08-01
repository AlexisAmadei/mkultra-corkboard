import { useState } from "react";
import { changePassword } from "../lib/auth";

export function AccountSettings({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPassword, password, passwordConfirm);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Account settings</h2>

        {done ? (
          <p>Password updated.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label>
              Current password
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <div className="modal-actions">
              <div className="spacer" />
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={busy}>
                Save
              </button>
            </div>
          </form>
        )}

        {done && (
          <div className="modal-actions">
            <div className="spacer" />
            <button onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
