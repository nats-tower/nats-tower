package store

import "github.com/pocketbase/pocketbase/core"

func InitUserCollection(e *core.ServeEvent) error {
	collection, err := e.App.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	collection.Fields.Add(&core.JSONField{
		Name:    "preferences",
		MaxSize: 1024 * 1024, // 1MB
	})

	return e.App.Save(collection)
}
