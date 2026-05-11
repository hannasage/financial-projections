/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("plans");

  collection.fields.add(new JSONField({
    name:     "excludedMarkerIds",
    required: false,
    maxSize:  100000,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("plans");
  collection.fields.removeByName("excludedMarkerIds");
  app.save(collection);
});
