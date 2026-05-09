/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("plans");

  collection.fields.add(new AutodateField({
    name:     "created",
    onCreate: true,
    onUpdate: false,
  }));

  collection.fields.add(new AutodateField({
    name:     "updated",
    onCreate: true,
    onUpdate: true,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("plans");
  collection.fields.removeByName("created");
  collection.fields.removeByName("updated");
  app.save(collection);
});
