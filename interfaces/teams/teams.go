package teams

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
	"github.com/pocketbase/pocketbase/tools/types"

	"github.com/nats-tower/nats-tower/utils"
)

var (
	ErrNotFound = errors.New("not found")
)

type TeamsModule struct {
	ctx             context.Context
	logger          *slog.Logger
	cfg             TeamsModuleConfig
	usersCollection *core.Collection

	TeamsCollection *core.Collection
}

type MicrosoftAuth struct {
	ClientID string
	TenantID string
	Secret   string
	// startswith(description, 'Automatically created M365 Group which keeps the team members up')
	GroupFilter string
}

type TeamsModuleConfig struct {
	App                 core.App
	UsersCollectionName string
	MicrosoftAuth       MicrosoftAuth
}

func CreateTeamsModule(ctx context.Context,
	logger *slog.Logger,
	cfg TeamsModuleConfig) (*TeamsModule, error) {

	usersCollection, err := cfg.App.FindCollectionByNameOrId(cfg.UsersCollectionName)
	if err != nil {
		return nil, err
	}

	t := &TeamsModule{
		ctx:             ctx,
		logger:          logger,
		cfg:             cfg,
		usersCollection: usersCollection,
	}

	tColl, err := initTeamCollection(t.cfg.App, usersCollection)
	if err != nil {
		return nil, err
	}
	t.TeamsCollection = tColl

	if cfg.MicrosoftAuth.ClientID != "" && cfg.MicrosoftAuth.TenantID != "" && cfg.MicrosoftAuth.Secret != "" {

		err = cfg.App.Cron().Add("sync-microsoft-teams", "0 0 * * *", func() {
			start := time.Now()
			logger.InfoContext(ctx, "Syncing microsoft teams...")
			defer func() {
				logger.InfoContext(ctx, "Syncing microsoft teams...Done", slog.Duration("duration", time.Since(start)))
			}()
			err := t.SyncMicrosoftTeams(ctx)
			if err != nil {
				logger.ErrorContext(ctx, "Could not sync microsoft teams", slog.String("error", err.Error()))
			}
		})
		if err != nil {
			return nil, err
		}
	}

	t.cfg.App.OnRecordAuthWithOAuth2Request().BindFunc(func(e *core.RecordAuthWithOAuth2RequestEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		switch e.ProviderName {
		case "microsoft":

			err := t.UpdateMicrosoftTeamMembership(ctx, e)
			if err != nil {
				logger.ErrorContext(ctx, "Could not update microsoft team membership", slog.String("error", err.Error()))
			}
		default:
		}

		return nil
	})

	return t, nil
}

func (s *TeamsModule) UpsertTeam(ctx context.Context, t *Team) error {
	err := s.cfg.App.RunInTransaction(func(txDao core.App) error {

		exp := dbx.HashExp{
			"name": t.Name,
		}
		if t.ExternalID != "" {
			exp["external_id"] = t.ExternalID
		}

		records, err := txDao.FindAllRecords("teams",
			exp,
		)
		if err != nil {
			return err
		}
		if len(records) != 0 {
			teamRecord := records[0]
			t.ID = teamRecord.Id

			members := teamRecord.GetStringSlice("members")
			newTeam := Team{
				ID:        t.ID,
				Name:      t.Name,
				MemberIDs: members,
			}
			if !newTeam.MergeMembers(ctx, t.MemberIDs) {
				return nil
			}
			// changed => update team
			teamRecord.Set("members", newTeam.MemberIDs)
			t.MemberIDs = newTeam.MemberIDs

			s.logger.InfoContext(ctx, "Upserting team with new member", slog.String("name", t.Name))
			if err := txDao.Save(teamRecord); err != nil {
				s.logger.ErrorContext(ctx, "Could not upsert team", slog.String("name", t.Name), slog.String("error", err.Error()))
				return err
			}
			return nil
		}
		coll, err := txDao.FindCollectionByNameOrId("teams")
		if err != nil {
			return err
		}
		record := core.NewRecord(coll)
		record.Set("name", t.Name)
		record.Set("members", t.MemberIDs)
		record.Set("external", t.External)
		record.Set("external_id", t.ExternalID)

		// validate and submit (internally it calls app.Dao().SaveRecord(record) in a transaction)
		s.logger.InfoContext(ctx, "Upserting team", slog.String("name", t.Name))
		if err := txDao.Save(record); err != nil {
			s.logger.ErrorContext(ctx, "Could not upsert team", slog.String("name", t.Name), slog.String("error", err.Error()))
			return err
		}
		t.ID = record.Id
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

// avatar is optional
func (s *TeamsModule) UpsertUser(ctx context.Context, u *User, avatar *filesystem.File) error {

	exp := dbx.HashExp{
		"email": u.Email,
	}

	records, err := s.cfg.App.FindAllRecords("users",
		exp,
	)
	if err != nil {
		return err
	}
	if len(records) != 0 {
		// already exists
		// change of email is not considered (renaming, etc.)
		// manual intervention is required
		u.ID = records[0].Id
		return nil
	}
	coll, err := s.cfg.App.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	record := core.NewRecord(coll)
	record.SetEmail(u.Email)
	record.SetEmailVisibility(true)
	record.SetVerified(true)
	record.Set("name", u.DisplayName)
	record.SetPassword(uuid.New().String())

	// avatar is optional
	if avatar != nil {
		record.Set("avatar", avatar)
	}

	// validate and submit (internally it calls app.Dao().SaveRecord(record) in a transaction)
	s.logger.InfoContext(ctx, "Upserting User", slog.String("name", u.DisplayName))
	if err := s.cfg.App.Save(record); err != nil {
		s.logger.ErrorContext(ctx, "Could not upsert user", slog.String("name", u.DisplayName), slog.String("error", err.Error()))
		return err
	}
	u.ID = record.Id
	return nil
}

type GetUsersOptions struct {
}

func (s *TeamsModule) GetUsers(ctx context.Context, opts GetUsersOptions) ([]*User, error) {
	var res []*User

	records, err := s.cfg.App.FindAllRecords("users")
	if err != nil {
		return nil, err
	}

	for _, rec := range records {
		res = append(res, UserFromRecord(rec))
	}
	return res, nil
}

type GetTeamsOptions struct {
}

func (s *TeamsModule) GetTeams(ctx context.Context, opts GetTeamsOptions) ([]*Team, error) {
	var res []*Team

	records, err := s.cfg.App.FindAllRecords("teams")
	if err != nil {
		return nil, err
	}

	for _, rec := range records {
		res = append(res, TeamFromRecord(rec))
	}
	return res, nil
}

func TeamFromRecord(record *core.Record) *Team {
	return &Team{
		ID:         record.Id,
		Name:       record.GetString("name"),
		External:   record.GetBool("external"),
		ExternalID: record.GetString("external_id"),
		MemberIDs:  record.GetStringSlice("members"),
	}
}

type Team struct {

	// id
	// Read Only: true
	ID string `json:"id,omitempty"`

	// name
	// Required: true
	Name string `json:"name"`

	External   bool   `json:"external"`
	ExternalID string `json:"external_id"`

	MemberIDs []string `json:"members"`
}

type User struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

func UserFromRecord(record *core.Record) *User {
	return &User{
		ID:          record.Id,
		DisplayName: record.GetString("name"),
		Email:       record.Email(),
	}
}

func (t *Team) UpsertUser(ctx context.Context, userID string) {
	for _, id := range t.MemberIDs {
		if userID == id {
			return
		}
	}
	t.MemberIDs = append(t.MemberIDs, userID)
}

func (t *Team) MergeMembers(ctx context.Context, userIDs []string) bool {
	unique := map[string]bool{}
	changed := false
	var res []string
	for _, id := range t.MemberIDs {
		unique[id] = true
	}
	for _, newID := range userIDs {
		if ok := unique[newID]; !ok {
			changed = true
		}
		unique[newID] = true
	}
	for id := range unique {
		res = append(res, id)
	}
	t.MemberIDs = res
	return changed
}

func initTeamCollection(app core.App, usersCollection *core.Collection) (*core.Collection, error) {

	collection, err := app.FindCollectionByNameOrId("teams")

	if err == sql.ErrNoRows {
		collection = core.NewBaseCollection("teams")
	}
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	utils.AddDefaultFieldsToCollection(collection)

	collection.ListRule = types.Pointer("@request.auth.id != ''")
	collection.ViewRule = types.Pointer("@request.auth.id != ''")
	collection.CreateRule = types.Pointer("@request.auth.id != ''")
	collection.UpdateRule = types.Pointer("@request.auth.id != '' && (members:length = 0 || members.id = @request.auth.id)")
	collection.DeleteRule = types.Pointer("@request.auth.id != '' && (members:length = 0 || members.id = @request.auth.id)")

	addOrUpdateField(collection, &core.TextField{
		Name:     "name",
		Required: true,
		Max:      200,
	})
	addOrUpdateField(collection, &core.BoolField{
		Name: "external",
	})
	addOrUpdateField(collection, &core.TextField{
		Name: "external_id",
		Max:  200,
	})
	addOrUpdateField(collection, &core.RelationField{
		Name:         "members",
		CollectionId: usersCollection.Id,
		MaxSelect:    math.MaxInt32,
	})

	// validate and submit (internally it calls app.Dao().SaveCollection(collection) in a transaction)
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

func (s *TeamsModule) GetMemberShips(ctx context.Context, userID string) ([]*Team, error) {
	records, err := s.cfg.App.FindAllRecords("teams") // dbx.HashExp{
	// 	"members": userID,
	// },

	if err != nil {
		return nil, err
	}

	var res []*Team
	for _, rec := range records {
		members := rec.GetStringSlice("members")

		if !contains(members, userID) {
			continue
		}

		res = append(res, TeamFromRecord(rec))
	}
	return res, nil
}

func contains(a []string, s string) bool {
	for _, str := range a {
		if str == s {
			return true
		}
	}
	return false
}
