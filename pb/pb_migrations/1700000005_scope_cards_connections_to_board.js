/// <reference path="../pb_data/types.d.ts" />

// Adds a `board` relation to cards/connections (optional for now — legacy
// rows get backfilled by the next migration) and rewrites the API rules so
// access follows the owning board's ownership/collaborator/public status
// instead of being fully open.
migrate(
  (app) => {
    const boards = app.findCollectionByNameOrId("boards");
    const cards = app.findCollectionByNameOrId("cards");
    const connections = app.findCollectionByNameOrId("connections");

    // The back-relation `?=` check is guarded by `@request.auth.id != ""`
    // because PocketBase's back-relation join otherwise false-positives for
    // anonymous requests against boards with zero collaborator rows. The
    // whole expression is also guarded by `board != ""` because a card with
    // no board (only possible transiently, before the legacy-data migration
    // backfills pre-multi-user rows) otherwise resolves `board.*` dot-paths
    // in a way that similarly false-positives instead of denying access —
    // this keeps unmigrated rows locked out of the API entirely until they
    // have a board.
    const canRead =
      'board != "" && (' +
      'board.owner = @request.auth.id || ' +
      '(@request.auth.id != "" && board.board_collaborators_via_board.user ?= @request.auth.id) || ' +
      'board.visibility = "public"' +
      ')';
    const canWrite =
      'board != "" && (' +
      'board.owner = @request.auth.id || ' +
      '(@request.auth.id != "" && board.board_collaborators_via_board.user ?= @request.auth.id)' +
      ')';

    // Update rules are evaluated against the *pre-update* row, so `canWrite`
    // alone only proves the caller may write the board the record is in today
    // — it says nothing about the board they're moving it to. Without this
    // guard an editor of board A could PATCH `{"board": "<someone else's>"}`
    // and inject a card into a board they have no access to.
    const boardUnchanged =
      "(@request.body.board:isset = false || @request.body.board = board)";
    const canUpdate = canWrite + " && " + boardUnchanged;

    cards.fields.add(
      new RelationField({
        name: "board",
        required: false,
        maxSelect: 1,
        collectionId: boards.id,
        cascadeDelete: true,
      }),
    );
    cards.listRule = canRead;
    cards.viewRule = canRead;
    cards.createRule = canWrite;
    cards.updateRule = canUpdate;
    cards.deleteRule = canWrite;
    app.save(cards);

    connections.fields.add(
      new RelationField({
        name: "board",
        required: false,
        maxSelect: 1,
        collectionId: boards.id,
        cascadeDelete: true,
      }),
    );
    connections.listRule = canRead;
    connections.viewRule = canRead;
    connections.createRule = canWrite;
    connections.updateRule = canUpdate;
    connections.deleteRule = canWrite;
    app.save(connections);
  },
  (app) => {
    const cards = app.findCollectionByNameOrId("cards");
    const connections = app.findCollectionByNameOrId("connections");
    for (const c of [cards, connections]) {
      c.fields.removeByName("board");
      c.listRule = "";
      c.viewRule = "";
      c.createRule = "";
      c.updateRule = "";
      c.deleteRule = "";
      app.save(c);
    }
  },
);
