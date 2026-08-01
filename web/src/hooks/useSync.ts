import { useEffect } from "react";
import { useBoard } from "../store/boardStore";
import { cardsApi, connectionsApi, pb, recordToCard, recordToConnection } from "../lib/pocketbase";

/**
 * Loads the given board once and subscribes to PocketBase realtime (scoped to
 * that board) so other tabs / the admin UI stay in sync. Local optimistic
 * updates already reflect our own edits; realtime just folds in external
 * changes.
 */
export function useSync(boardId: string) {
  useEffect(() => {
    void useBoard.getState().load(boardId);

    const filter = pb.filter("board = {:board}", { board: boardId });

    const unsubCards = cardsApi.subscribe(
      "*",
      (e) => {
        useBoard.getState().applyRemote(
          "card",
          e.action as "create" | "update" | "delete",
          recordToCard(e.record),
        );
      },
      { filter },
    );
    const unsubConns = connectionsApi.subscribe(
      "*",
      (e) => {
        useBoard.getState().applyRemote(
          "connection",
          e.action as "create" | "update" | "delete",
          recordToConnection(e.record),
        );
      },
      { filter },
    );

    return () => {
      void unsubCards.then((u) => u());
      void unsubConns.then((u) => u());
    };
  }, [boardId]);
}
