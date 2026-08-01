/// <reference path="../pb_data/types.d.ts" />

// Re-applies two rule fixes that were also made in-place in migrations 003
// and 005. Those edits only take effect on a database that has never run
// them; any environment that already migrated (dev, and the prod volume if it
// has booted the multi-user build) keeps the old rules forever, because
// PocketBase never re-runs an applied migration. This migration exists so the
// fixes reach those environments too — it is a no-op on a fresh install where
// 003/005 already wrote the hardened versions.
//
// 1. `users` list/view had no auth guard. Signup sets `emailVisibility: true`
//    on every account, so an anonymous GET /api/collections/users/records
//    enumerated every user's email address.
// 2. `cards`/`connections` update rules are evaluated against the pre-update
//    row and never constrained `@request.body.board`, so an editor of one
//    board could PATCH a record into a board they have no access to.
const CAN_SEE_USER =
  '@request.auth.id != "" && (id = @request.auth.id || emailVisibility = true)';
const CAN_SEE_USER_OLD = "id = @request.auth.id || emailVisibility = true";

const BOARD_UNCHANGED =
  "(@request.body.board:isset = false || @request.body.board = board)";

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = CAN_SEE_USER;
    users.viewRule = CAN_SEE_USER;
    app.save(users);

    for (const name of ["cards", "connections"]) {
      const c = app.findCollectionByNameOrId(name);
      if (c.updateRule && c.updateRule.indexOf("@request.body.board") === -1) {
        c.updateRule = c.updateRule + " && " + BOARD_UNCHANGED;
        app.save(c);
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = CAN_SEE_USER_OLD;
    users.viewRule = CAN_SEE_USER_OLD;
    app.save(users);

    const suffix = " && " + BOARD_UNCHANGED;
    for (const name of ["cards", "connections"]) {
      const c = app.findCollectionByNameOrId(name);
      if (c.updateRule && c.updateRule.endsWith(suffix)) {
        c.updateRule = c.updateRule.slice(0, -suffix.length);
        app.save(c);
      }
    }
  },
);
