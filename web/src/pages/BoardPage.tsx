import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Board } from "../components/Board";
import { useSync } from "../hooks/useSync";
import { boardsApi, collaboratorsApi, pb, recordToBoard } from "../lib/pocketbase";
import { useAuth } from "../store/authStore";
import { useBoard } from "../store/boardStore";
import { track } from "../lib/openpanel";
import type { Board as BoardModel } from "../types";

type Access = "loading" | "denied" | "granted";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const user = useAuth((s) => s.user);
  const [board, setBoard] = useState<BoardModel | null>(null);
  const [access, setAccess] = useState<Access>("loading");

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    setAccess("loading");

    (async () => {
      try {
        const record = await boardsApi.getOne(boardId);
        const b = recordToBoard(record);
        if (cancelled) return;

        let canEdit = false;
        if (user && b.owner === user.id) {
          canEdit = true;
        } else if (user) {
          try {
            await collaboratorsApi.getFirstListItem(
              pb.filter("board = {:board} && user = {:user}", { board: b.id, user: user.id }),
            );
            canEdit = true;
          } catch {
            canEdit = false;
          }
        }

        if (cancelled) return;
        setBoard(b);
        useBoard.getState().setCanEdit(canEdit);
        setAccess("granted");
        track("board_open", { boardId: b.id, visibility: b.visibility, canEdit });
      } catch {
        if (!cancelled) setAccess("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, user]);

  if (!boardId) return null;

  if (access === "loading") {
    return <div className="board-page-status">Loading…</div>;
  }

  if (access === "denied" || !board) {
    return (
      <div className="board-page-status">
        <p>This board doesn't exist, or you don't have access to it.</p>
        <a href="/boards">Back to boards</a>
      </div>
    );
  }

  return <BoardCanvas boardId={board.id} />;
}

function BoardCanvas({ boardId }: { boardId: string }) {
  useSync(boardId);
  return <Board />;
}
