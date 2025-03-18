package natsauth

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func (m *NATSAuthModule) initNATSAuthCollections(app core.App) error {

	apiRule := "@request.auth.id != ''"
	if m.cfg.APIToken != "" {
		apiRule = fmt.Sprintf("@request.auth.id != '' || @request.headers.x_token = '%s'", m.cfg.APIToken)
	}

	limitCollection, err := initNATSAuthLimitsCollection(m.ctx,
		app,
		m.logger,
		apiRule)
	if err != nil {
		return err
	}

	operatorCollection, err := initNATSAuthOperatorsCollection(m.ctx,
		app,
		m.logger,
		apiRule,
		m.cfg.InitialOperatorURLs)
	if err != nil {
		return err
	}
	accountCollection, err := initNATSAuthAccountsCollection(m.ctx,
		app,
		m.logger,
		apiRule,
		operatorCollection,
		limitCollection,
		m.cfg.InitialOperatorURLs,
		m.cfg.InitialAccountName,
		m.cfg.InitialAccountPublicKey,
		m.cfg.InitialAccountSigningSeed)
	if err != nil {
		return err
	}
	userCollection, err := initNATSAuthUsersCollection(m.ctx,
		app,
		m.logger,
		apiRule,
		accountCollection)
	if err != nil {
		return err
	}
	m.NATSOperatorCollection = operatorCollection
	m.NATSAccountCollection = accountCollection
	m.NATSUserCollection = userCollection

	return nil
}

func initNATSAuthOperatorsCollection(ctx context.Context, app core.App,
	logger *slog.Logger,
	rule string,
	initialOperatorURLs string) (*core.Collection, error) {

	collection, err := app.FindCollectionByNameOrId("nats_auth_operators")

	if err == sql.ErrNoRows {
		collection = core.NewBaseCollection("nats_auth_operators")
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	collection.ListRule = types.Pointer(rule)
	collection.ViewRule = types.Pointer(rule)
	collection.CreateRule = types.Pointer(rule)
	collection.UpdateRule = types.Pointer(rule)
	collection.DeleteRule = types.Pointer(rule)
	collection.Indexes = types.JSONArray[string]{
		"create unique index nats_operators_unique_url on keys (url)",
		"create unique index nats_operators_unique_public_key on keys (public_key)",
	}
	addOrUpdateField(collection, &core.TextField{
		Name:        "url",
		Required:    true,
		Presentable: true,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "description",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "public_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "private_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "seed",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "jwt",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_public_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_private_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_seed",
		Required: false,
	})

	// validate and submit (internally it calls app.SaveCollection(collection) in a transaction)
	if err := app.Save(collection); err != nil {
		return nil, err
	}

	if initialOperatorURLs != "" {
		rec, err := app.FindAllRecords("nats_auth_operators", dbx.HashExp{
			"url": initialOperatorURLs,
		})
		if err != nil {
			return nil, err
		}

		if len(rec) == 0 {
			logger.InfoContext(ctx, "Creating initial operator...")
			// creating initial operator
			record := core.NewRecord(collection)
			record.Set("url", initialOperatorURLs)
			err = app.Save(record)
			if err != nil {
				return nil, err
			}
		} else {
			logger.InfoContext(ctx, "Initial operator already exists")
		}
	}

	return collection, nil
}

func initNATSAuthAccountsCollection(ctx context.Context,
	app core.App,
	logger *slog.Logger,
	rule string,
	operatorCollection *core.Collection,
	limitCollection *core.Collection,
	initialOperatorURLs string,
	InitialAccountName string,
	InitialAccountPublicKey string,
	InitialAccountSigningSeed string) (*core.Collection, error) {

	collection, err := app.FindCollectionByNameOrId("nats_auth_accounts")

	if err == sql.ErrNoRows {
		collection = core.NewBaseCollection("nats_auth_accounts")
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	collection.ListRule = types.Pointer(rule)
	collection.ViewRule = types.Pointer(rule)
	collection.CreateRule = types.Pointer(rule)
	collection.UpdateRule = types.Pointer(rule)
	collection.DeleteRule = types.Pointer(rule)
	collection.Indexes = types.JSONArray[string]{
		"create unique index nats_accounts_unique_name_operator on keys (name,operator)",
		"create unique index nats_accounts_unique_public_key on keys (public_key)",
	}

	addOrUpdateField(collection, &core.TextField{
		Name:     "name",
		Required: true,
	})
	addOrUpdateField(collection, &core.TextField{
		Name: "description",
	})
	addOrUpdateField(collection, &core.RelationField{
		Name:          "operator",
		Required:      true,
		CollectionId:  operatorCollection.Id,
		MaxSelect:     1,
		CascadeDelete: true,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "public_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "private_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "seed",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "jwt",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_public_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_private_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "sign_seed",
		Required: false,
	})
	addOrUpdateField(collection, &core.RelationField{
		Name:         "limits",
		CollectionId: limitCollection.Id,
		Required:     false,
		MaxSelect:    1,
	})

	// validate and submit (internally it calls app.SaveCollection(collection) in a transaction)
	if err := app.Save(collection); err != nil {
		return nil, err
	}
	if initialOperatorURLs != "" {
		if InitialAccountName == "" || InitialAccountPublicKey == "" || InitialAccountSigningSeed == "" {
			return nil, fmt.Errorf("InitialAccountName, InitialAccountPublicKey and InitialAccountSigningSeed must be set")
		}
		logger.InfoContext(ctx, "Making sure initial account exists...")

		var operatorID string
		// 1. lets find Operator ID
		operatorRecords, err := app.FindAllRecords("nats_auth_operators",
			dbx.HashExp{
				"url": initialOperatorURLs,
			})
		if err != nil {
			logger.ErrorContext(ctx, "Could not find initial operator(error)", slog.String("error", err.Error()))
			return nil, err
		}
		if len(operatorRecords) == 0 {
			return nil, fmt.Errorf("Could not find initial operator")
		} else {
			operatorID = operatorRecords[0].Id
		}
		// 2. check if account exists
		initAccountRecords, err := app.FindAllRecords("nats_auth_accounts",
			dbx.HashExp{
				"operator": operatorID,
				"name":     InitialAccountName,
			})
		if err != nil {
			logger.ErrorContext(ctx, "Could not find initial account(error)", slog.String("error", err.Error()))
			return nil, err
		}
		if len(initAccountRecords) == 0 {
			// does not exist yet => create
			logger.InfoContext(ctx, "Creating initial account...")
			record := core.NewRecord(collection)
			record.Set("operator", operatorID)
			record.Set("name", InitialAccountName)
			record.Set("public_key", InitialAccountPublicKey)
			record.Set("sign_seed", InitialAccountSigningSeed)
			err = app.Save(record)
			if err != nil {
				return nil, err
			}
		} else {
			logger.InfoContext(ctx, "Initial account already exists")
		}
	}
	return collection, nil
}

func initNATSAuthUsersCollection(_ context.Context,
	app core.App,
	_ *slog.Logger,
	rule string,
	accountCollection *core.Collection) (*core.Collection, error) {

	collection, err := app.FindCollectionByNameOrId("nats_auth_users")

	if err == sql.ErrNoRows {
		collection = core.NewBaseCollection("nats_auth_users")
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	collection.ListRule = types.Pointer(rule)
	collection.ViewRule = types.Pointer(rule)
	collection.CreateRule = types.Pointer(rule)
	collection.UpdateRule = types.Pointer(rule)
	collection.DeleteRule = types.Pointer(rule)
	collection.Indexes = types.JSONArray[string]{
		"create unique index nats_users_unique_name_account on keys (name,account)",
		"create unique index nats_users_unique_public_key on keys (public_key)",
	}

	addOrUpdateField(collection, &core.TextField{
		Name:     "name",
		Required: true,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "description",
		Required: false,
	})
	addOrUpdateField(collection, &core.RelationField{
		Name:          "account",
		Required:      true,
		CollectionId:  accountCollection.Id,
		MaxSelect:     1,
		CascadeDelete: true,
	})
	addOrUpdateField(collection, &core.BoolField{
		Name:     "bearer",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "public_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "private_key",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "seed",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "jwt",
		Required: false,
	})
	addOrUpdateField(collection, &core.TextField{
		Name:     "creds",
		Required: false,
	})

	// validate and submit (internally it calls app.SaveCollection(collection) in a transaction)
	if err := app.Save(collection); err != nil {
		return nil, err
	}
	return collection, nil
}

func initNATSAuthLimitsCollection(_ context.Context,
	app core.App,
	_ *slog.Logger,
	rule string) (*core.Collection, error) {

	collection, err := app.FindCollectionByNameOrId("nats_auth_limits")

	if err == sql.ErrNoRows {
		collection = core.NewBaseCollection("nats_auth_limits")
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	collection.ListRule = types.Pointer(rule)
	collection.ViewRule = types.Pointer(rule)
	collection.CreateRule = types.Pointer(rule)
	collection.UpdateRule = types.Pointer(rule)
	collection.DeleteRule = types.Pointer(rule)
	collection.Indexes = types.JSONArray[string]{
		"create unique index nats_auth_limits_unique_name on nats_auth_limits (name)",
	}

	addOrUpdateField(collection, &core.TextField{
		Name:     "name",
		Required: true,
	})
	addOrUpdateField(collection, &core.SelectField{
		Name:     "type",
		Required: true,
		Values: []string{
			"account",
		},
		MaxSelect: 1,
	})

	addOrUpdateField(collection, &core.NumberField{
		Name:     "max_connections",
		Required: true,
		OnlyInt:  true,
	})

	addOrUpdateField(collection, &core.NumberField{
		Name:     "jetstream_max_memory",
		Required: true,
		OnlyInt:  true,
	})

	addOrUpdateField(collection, &core.NumberField{
		Name:     "jetstream_max_disk",
		Required: true,
		OnlyInt:  true,
	})

	addOrUpdateField(collection, &core.BoolField{
		Name:     "default",
		Required: false,
	})

	// validate and submit (internally it calls app.SaveCollection(collection) in a transaction)
	if err := app.Save(collection); err != nil {
		return nil, err
	}
	return collection, nil
}

func addOrUpdateField(form *core.Collection, field core.Field) {
	if f := form.Fields.GetByName(field.GetName()); f != nil {
		field.SetId(f.GetId())
	}

	form.Fields.Add(field)
}
