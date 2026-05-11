/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("plans");

  collection.fields.add(new JSONField({
    name:     "markers",
    required: false,
    maxSize:  200000,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("plans");
  collection.fields.removeByName("markers");
  app.save(collection);
});
