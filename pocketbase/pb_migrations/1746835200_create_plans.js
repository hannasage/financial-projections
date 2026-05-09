/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name:       "plans",
    type:       "base",
    listRule:   "@request.auth.id = user.id",
    viewRule:   "@request.auth.id = user.id",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user.id",
    deleteRule: "@request.auth.id = user.id",
    fields: [
      {
        name:           "user",
        type:           "relation",
        required:       true,
        collectionId:   "_pb_users_auth_",
        cascadeDelete:  true,
        maxSelect:      1,
      },
      {
        name:      "title",
        type:      "text",
        required:  true,
        max:       80,
      },
      {
        name:      "description",
        type:      "text",
        required:  false,
        max:       300,
      },
      {
        name:      "color",
        type:      "text",
        required:  false,
      },
      {
        name:      "scenario",
        type:      "json",
        required:  false,
        maxSize:   2000000,
      },
    ],
    indexes: [
      "CREATE INDEX idx_plans_user ON plans (user)",
    ],
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("plans");
  app.delete(collection);
});
