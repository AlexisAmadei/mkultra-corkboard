/// <reference path="../pb_data/types.d.ts" />

// Configures the built-in `users` auth collection: password + OAuth2 login
// (providers themselves are added later through the admin UI — no secrets
// belong in code), and rules that let a signed-in user see their own record
// plus any user who opted into `emailVisibility` (needed for collaborator
// invite-by-email lookups).
migrate(
  (app) => {
    let users;
    try {
      users = app.findCollectionByNameOrId("users");
    } catch {
      users = new Collection({ type: "auth", name: "users" });
    }

    // The `@request.auth.id != ""` prefix is load-bearing: signup sets
    // `emailVisibility: true` on every account, so without it an anonymous
    // GET /api/collections/users/records would enumerate every user's email.
    const canSeeUser =
      '@request.auth.id != "" && (id = @request.auth.id || emailVisibility = true)';
    users.listRule = canSeeUser;
    users.viewRule = canSeeUser;
    users.createRule = "";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";

    users.passwordAuth = { enabled: true, identityFields: ["email"] };
    users.oauth2 = { enabled: true };

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = null;
    users.viewRule = null;
    users.createRule = null;
    users.updateRule = null;
    users.deleteRule = null;
    users.oauth2 = { enabled: false };
    app.save(users);
  },
);
