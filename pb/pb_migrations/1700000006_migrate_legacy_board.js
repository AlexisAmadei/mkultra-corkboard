/// <reference path="../pb_data/types.d.ts" />

// One-time data migration: cards/connections that predate the multi-user
// model get assigned to a single new "My Board" owned by a specific user.
// That user must already have signed up (so their `users` record exists).
//
// This does NOT throw when no owner can be resolved, because a thrown error
// in a migration aborts the entire `serve` boot — which would make it
// impossible for anyone to ever sign up (the server can't start to accept the
// signup that this migration is waiting on). Instead it logs and completes as
// a no-op; PocketBase then marks it applied and will not retry automatically.
// Once an account exists, re-run this specific migration by deleting its row
// from the `_migrations` collection (Admin UI -> or
// `DELETE FROM _migrations WHERE file = '1700000006_migrate_legacy_board.js'`
// against pb_data) and restarting the server.
//
// To narrow that window: if OWNER_EMAIL hasn't signed up but some other
// account has, the oldest account adopts the board rather than leaving the
// rows orphaned. The next migration makes `board` required and the rules in
// 1700000005 deny `board = ""`, so orphaned rows are invisible through the
// API until the re-run above happens.
const OWNER_EMAIL = "alexisamadei@proton.me";
const BOARD_NAME = "My Board";

function resolveOwner(app) {
  try {
    return app.findAuthRecordByEmail("users", OWNER_EMAIL);
  } catch {
    // fall through to the oldest-account fallback
  }
  const users = app.findRecordsByFilter("users", "id != ''", "created", 1, 0);
  if (users.length > 0) {
    console.warn(
      `migrate_legacy_board: no user ${OWNER_EMAIL} — assigning legacy board to oldest account ${users[0].getString("email")}`,
    );
    return users[0];
  }
  return null;
}

migrate(
  (app) => {
    const legacyCount = ["cards", "connections"].reduce(
      (n, name) =>
        n + app.findRecordsByFilter(name, "board = null", "", 0, 0).length,
      0,
    );
    if (legacyCount === 0) {
      // Fresh install: nothing predates the multi-user model.
      return;
    }

    const owner = resolveOwner(app);
    if (!owner) {
      console.warn(
        `migrate_legacy_board: ${legacyCount} legacy row(s) but no user accounts exist — ` +
          `skipping. These rows stay hidden from the API until you sign up and re-run ` +
          `this migration (see file comment).`,
      );
      return;
    }

    const boards = app.findCollectionByNameOrId("boards");
    const board = new Record(boards, {
      name: BOARD_NAME,
      owner: owner.id,
      visibility: "private",
    });
    app.save(board);

    for (const name of ["cards", "connections"]) {
      const records = app.findRecordsByFilter(name, "board = null", "", 0, 0);
      for (const r of records) {
        r.set("board", board.id);
        app.save(r);
      }
    }
  },
  (app) => {
    try {
      // Matched by name only: the up-migration may have assigned the board to
      // the oldest account rather than OWNER_EMAIL.
      const board = app.findFirstRecordByFilter("boards", "name = {:name}", {
        name: BOARD_NAME,
      });
      for (const name of ["cards", "connections"]) {
        const records = app.findRecordsByFilter(
          name,
          "board = {:board}",
          "",
          0,
          0,
          { board: board.id },
        );
        for (const r of records) {
          r.set("board", "");
          app.save(r);
        }
      }
      app.delete(board);
    } catch {
      // nothing to roll back
    }
  },
);
