package utils

import "github.com/pocketbase/pocketbase/core"

func AddDefaultFieldsToCollection(collection *core.Collection) {
	// add autodate/timestamp fields (created/updated)
	collection.Fields.Add(&core.AutodateField{
		Name:     "created",
		OnCreate: true,
	})
	collection.Fields.Add(&core.AutodateField{
		Name:     "updated",
		OnCreate: true,
		OnUpdate: true,
	})
}
