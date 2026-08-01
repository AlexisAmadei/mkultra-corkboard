/// <reference path="../pb_data/types.d.ts" />

// Adds the `boards` collection (one board = one canvas) and the
// `board_collaborators` join collection (editors invited to a private
// board).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const boards = new Collection({
      type: "base",
      name: "boards",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        {
          name: "owner",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          name: "visibility",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["private", "public"],
        },
      ],
      indexes: ["CREATE INDEX idx_boards_owner ON boards (owner)"],
    });
    // The back-relation to `board_collaborators` can't resolve until that
    // collection exists, so save a temporary rule first and tighten it
    // below once `board_collaborators` has been created.
    boards.listRule = 'owner = @request.auth.id || visibility = "public"';
    boards.viewRule = boards.listRule;
    boards.createRule = '@request.auth.id != "" && @request.body.owner = @request.auth.id';
    boards.updateRule = "owner = @request.auth.id";
    boards.deleteRule = "owner = @request.auth.id";
    app.save(boards);

    const collaborators = new Collection({
      type: "base",
      name: "board_collaborators",
      fields: [
        {
          name: "board",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: boards.id,
          cascadeDelete: true,
        },
        {
          name: "user",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_board_collaborators_unique ON board_collaborators (board, user)",
      ],
    });
    const collaboratorsReadRule = "board.owner = @request.auth.id || user = @request.auth.id";
    collaborators.listRule = collaboratorsReadRule;
    collaborators.viewRule = collaboratorsReadRule;
    collaborators.createRule = "board.owner = @request.auth.id";
    collaborators.updateRule = "board.owner = @request.auth.id";
    collaborators.deleteRule = "board.owner = @request.auth.id || user = @request.auth.id";
    app.save(collaborators);

    // Now that `board_collaborators` exists, tighten the boards rules to
    // also grant access to invited collaborators. The back-relation `?=`
    // check is guarded by `@request.auth.id != ""` because PocketBase's
    // back-relation join otherwise false-positives for anonymous requests
    // against boards with zero collaborator rows.
    const boardsFullRule =
      'owner = @request.auth.id || ' +
      '(@request.auth.id != "" && board_collaborators_via_board.user ?= @request.auth.id) || ' +
      'visibility = "public"';
    boards.listRule = boardsFullRule;
    boards.viewRule = boardsFullRule;
    app.save(boards);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("board_collaborators"));
    app.delete(app.findCollectionByNameOrId("boards"));
  },
);
