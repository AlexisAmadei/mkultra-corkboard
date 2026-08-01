import { useEffect, useState } from "react";
import { boardsApi, collaboratorsApi, pb, recordToCollaborator, usersApi } from "../lib/pocketbase";
import type { Board, BoardCollaborator, Visibility } from "../types";

export function BoardSettings({
  board,
  onClose,
  onChange,
}: {
  board: Board;
  onClose: () => void;
  onChange: () => void;
}) {
  const [name, setName] = useState(board.name);
  const [visibility, setVisibility] = useState<Visibility>(board.visibility);
  const [collaborators, setCollaborators] = useState<BoardCollaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reloadCollaborators = () => {
    collaboratorsApi
      .getFullList({ filter: pb.filter("board = {:board}", { board: board.id }), expand: "user" })
      .then((records) => setCollaborators(records.map(recordToCollaborator)))
      .catch(() => setCollaborators([]));
  };

  useEffect(reloadCollaborators, [board.id]);

  const save = async () => {
    await boardsApi.update(board.id, { name, visibility });
    onChange();
    onClose();
  };

  const deleteBoard = async () => {
    if (!confirm(`Delete "${board.name}"? This permanently removes the board and all its cards. This cannot be undone.`)) {
      return;
    }
    await boardsApi.delete(board.id);
    onChange();
    onClose();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await usersApi.getFirstListItem(
        pb.filter("email = {:email}", { email: inviteEmail.trim() }),
      );
      await collaboratorsApi.create({ board: board.id, user: user.id });
      setInviteEmail("");
      reloadCollaborators();
    } catch {
      setError("No user found with that email, or they're already invited.");
    }
  };

  const removeCollaborator = async (id: string) => {
    await collaboratorsApi.delete(id);
    reloadCollaborators();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Board settings</h2>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            <option value="private">Private</option>
            <option value="public">Public (read-only link)</option>
          </select>
        </label>

        <h3>Collaborators</h3>
        <ul className="collaborator-list">
          {collaborators.map((c) => (
            <li key={c.id}>
              {c.expand?.user?.email ?? c.user}
              <button onClick={() => void removeCollaborator(c.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <form onSubmit={invite} className="invite-form">
          <input
            type="email"
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button type="submit">Invite</button>
        </form>
        {error && <div className="auth-error">{error}</div>}

        <div className="modal-actions">
          <button className="destructive" onClick={() => void deleteBoard()}>
            Delete board
          </button>
          <div className="spacer" />
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => void save()}>Save</button>
        </div>
      </div>
    </div>
  );
}
