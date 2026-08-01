/// <reference path="../pb_data/types.d.ts" />

// Now that legacy rows have a board (see the previous migration), enforce
// the relation as required.
migrate(
  (app) => {
    for (const name of ["cards", "connections"]) {
      const c = app.findCollectionByNameOrId(name);
      c.fields.getByName("board").required = true;
      app.save(c);
    }
  },
  (app) => {
    for (const name of ["cards", "connections"]) {
      const c = app.findCollectionByNameOrId(name);
      c.fields.getByName("board").required = false;
      app.save(c);
    }
  },
);
