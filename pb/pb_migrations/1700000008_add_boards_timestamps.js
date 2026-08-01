/// <reference path="../pb_data/types.d.ts" />

// Adds `created`/`updated` autodate fields to `boards` — the frontend sorts
// the board list by `-created`, but base collections here don't get
// timestamp fields automatically (same as `cards`/`connections`).
migrate(
  (app) => {
    const boards = app.findCollectionByNameOrId("boards");
    boards.fields.add(new AutodateField({ name: "created", onCreate: true }));
    boards.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
    app.save(boards);
  },
  (app) => {
    const boards = app.findCollectionByNameOrId("boards");
    boards.fields.removeByName("created");
    boards.fields.removeByName("updated");
    app.save(boards);
  },
);
