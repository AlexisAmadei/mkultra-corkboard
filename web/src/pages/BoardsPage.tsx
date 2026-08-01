import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Loader2, LogOut, Plus, Settings2, User, Upload } from "lucide-react";
import { boardsApi, recordToBoard } from "../lib/pocketbase";
import { logout } from "../lib/auth";
import { exportBoard, importBoard } from "../lib/boardExport";
import { useAuth } from "../store/authStore";
import type { Board } from "../types";
import { BoardSettings } from "../components/BoardSettings";
import { AccountSettings } from "../components/AccountSettings";
import pinImage from "../assets/pin.png";

/** Deterministic small tilt per board id, so notes look scattered but stable across renders. */
function noteRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(hash) % 90) - 45) / 10; // -4.5deg .. 4.5deg
}

function BoardNote({
  board,
  mine,
  onExport,
  onSettings,
}: {
  board: Board;
  mine: boolean;
  onExport?: () => void;
  onSettings?: () => void;
}) {
  return (
    <Link
      to={`/board/${board.id}`}
      className="board-note"
      style={{ transform: `rotate(${noteRotation(board.id)}deg)` }}
    >
      <img src={pinImage} className="pin" draggable={false} />
      {mine && (
        <div className="board-note-actions">
          <button
            type="button"
            className="board-note-action"
            title="Export"
            onClick={(e) => {
              e.preventDefault();
              onExport?.();
            }}
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            className="board-note-action"
            title="Settings"
            onClick={(e) => {
              e.preventDefault();
              onSettings?.();
            }}
          >
            <Settings2 size={13} />
          </button>
        </div>
      )}
      <div className="board-note-title">{board.name}</div>
      <div className="board-note-meta">
        <span className={`visibility-badge ${board.visibility}`}>{board.visibility}</span>
      </div>
    </Link>
  );
}

export function BoardsPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [settingsFor, setSettingsFor] = useState<Board | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    boardsApi
      .getFullList({ sort: "-created" })
      .then((records) => {
        setBoards(records.map(recordToBoard));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  };

  useEffect(reload, []);

  useEffect(() => {
    if (creating) newNameInputRef.current?.focus();
  }, [creating]);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    await boardsApi.create({ name: newName.trim(), owner: user.id, visibility: "private" });
    setNewName("");
    setCreating(false);
    reload();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setImportError(null);
    setImporting(true);
    try {
      const boardId = await importBoard(file, user.id);
      reload();
      navigate(`/board/${boardId}`);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const mine = boards.filter((b) => b.owner === user?.id);
  const others = boards.filter((b) => b.owner !== user?.id);

  return (
    <div className="boards-page">
      <div className="boards-topbar">
        <span className="brand">PROJET MK-ULTRA</span>
        {user?.email && <span className="boards-topbar-user">{user.email}</span>}
        <div className="spacer" />
        {importError && <span className="auth-error">{importError}</span>}
        <button type="button" disabled={importing} onClick={() => importInputRef.current?.click()}>
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? "Importing…" : "Import"}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => void handleImportFile(e)}
        />
        <button type="button" title="Account" onClick={() => setAccountOpen(true)}>
          <User size={14} />
          Account
        </button>
        <button type="button" onClick={() => void logout()}>
          <LogOut size={14} />
          Log out
        </button>
      </div>

      {!loaded && (
        <div className="boards-corkboard" style={{ alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="animate-spin" color="#fffdf6" />
        </div>
      )}

      {loaded && (
        <div className="boards-corkboard">
          <span className="board-section-label">My boards</span>

          <div
            className={`board-note new ${creating ? "editing" : ""}`}
            onClick={creating ? undefined : () => setCreating(true)}
          >
            {creating ? (
              <form onSubmit={createBoard}>
                <input
                  ref={newNameInputRef}
                  type="text"
                  placeholder="Board name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  onBlur={() => {
                    if (!newName.trim()) setCreating(false);
                  }}
                />
                <div className="board-note-new-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit">Create</button>
                </div>
              </form>
            ) : (
              <>
                <Plus size={22} />
                <span>New board</span>
              </>
            )}
          </div>

          {mine.map((b) => (
            <BoardNote
              key={b.id}
              board={b}
              mine
              onExport={() => void exportBoard(b.id)}
              onSettings={() => setSettingsFor(b)}
            />
          ))}
          {mine.length === 0 && !creating && (
            <p className="board-empty-note">Nothing pinned yet — add your first board.</p>
          )}

          <span className="board-section-label">Public boards</span>
          {others.length === 0 && <p className="board-empty-note">None visible.</p>}
          {others.map((b) => (
            <BoardNote key={b.id} board={b} mine={false} />
          ))}
        </div>
      )}

      {settingsFor && (
        <BoardSettings
          board={settingsFor}
          onClose={() => setSettingsFor(null)}
          onChange={reload}
        />
      )}

      {accountOpen && <AccountSettings onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
