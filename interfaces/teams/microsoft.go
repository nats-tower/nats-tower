package teams

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"

	"github.com/nats-tower/nats-tower/utils"
)

type microsoftGroup struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type microsoftUser struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	GivenName   string `json:"givenName"`
	Surname     string `json:"surname"`
	Mail        string `json:"mail"`
}

func (s *TeamsModule) SyncMicrosoftTeams(ctx context.Context) error {

	// Get token for the app
	tokenResp := struct {
		Token string `json:"access_token"`
	}{}
	err := doAzureJSON(ctx, s.logger, "POST",
		fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", s.cfg.MicrosoftAuth.TenantID),
		"",
		strings.NewReader(fmt.Sprintf("client_id=%s&scope=%s&client_secret=%s&grant_type=client_credentials",
			s.cfg.MicrosoftAuth.ClientID, "https%3A%2F%2Fgraph.microsoft.com%2F.default", s.cfg.MicrosoftAuth.Secret)),
		&tokenResp)
	if err != nil {
		return err
	}

	// Get groups
	groups := []microsoftGroup{}

	nextLinkURL, err := url.Parse("https://graph.microsoft.com/v1.0/groups")
	if err != nil {
		return err
	}
	q := nextLinkURL.Query()
	if s.cfg.MicrosoftAuth.GroupFilter != "" {
		q.Set("$filter", s.cfg.MicrosoftAuth.GroupFilter)
		q.Set("$count", "true")
	}
	nextLinkURL.RawQuery = q.Encode()

	nextLink := nextLinkURL.String()

	knownUsers := map[string]*User{}

	for {
		s.logger.Info("Getting groups", slog.String("url", nextLink))
		resp := struct {
			NextLink string           `json:"@odata.nextLink"`
			Value    []microsoftGroup `json:"value"`
		}{}
		err = doAzureJSON(ctx, s.logger, "GET",
			nextLink,
			tokenResp.Token,
			nil,
			&resp)
		if err != nil {
			return err
		}
		groups = append(groups, resp.Value...)

		if resp.NextLink == "" {
			break
		}
		nextLink = resp.NextLink
	}

	for _, grp := range groups {
		s.logger.Debug("Got group", slog.String("name", grp.DisplayName))
		t := &Team{
			Name:       grp.DisplayName,
			External:   true,
			ExternalID: grp.ID,
		}

		err = s.SyncTeamMembers(ctx, tokenResp.Token, knownUsers, t)
		if err != nil {
			return err
		}

		err = s.UpsertTeam(ctx, t)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *TeamsModule) SyncTeamMembers(ctx context.Context, token string, knownUsers map[string]*User, t *Team) error {
	resp := struct {
		Value []microsoftUser `json:"value"`
	}{}

	err := doAzureJSON(ctx, s.logger, "GET",
		fmt.Sprintf("https://graph.microsoft.com/v1.0/groups/%s/members", t.ExternalID),
		token,
		nil,
		&resp)
	if err != nil {
		return err
	}

	for _, user := range resp.Value {

		if knownUser, ok := knownUsers[user.ID]; ok {
			t.UpsertUser(ctx, knownUser.ID)
			continue
		}
		s.logger.Debug("Got user", slog.String("name", user.DisplayName))
		u := &User{
			DisplayName: user.DisplayName,
			Email:       user.Mail,
		}

		avatar, _ := s.GetMicrosoftAvatar(ctx, token, user.ID)

		err = s.UpsertUser(ctx, u, avatar)
		if err != nil {
			continue
		}

		knownUsers[user.ID] = u

		t.UpsertUser(ctx, u.ID)
	}

	return nil
}

func (s *TeamsModule) GetMicrosoftAvatar(ctx context.Context, token string, id string) (*filesystem.File, error) {

	// Update user avatar
	//GET https://graph.microsoft.com/v1.0/me/photo/$value
	req, err := http.NewRequestWithContext(ctx,
		"GET",
		fmt.Sprintf(`https://graph.microsoft.com/v1.0/users/%s/photo/$value`, id), nil)
	if err != nil {
		s.logger.Error("Could not get user avatar", slog.String("error", err.Error()))
		return nil, err
	}
	// req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", token)

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		s.logger.Error("Could not get user avatar (do)", slog.String("error", err.Error()))
		return nil, err
	}

	if resp.StatusCode != 200 {
		if resp.StatusCode == 404 {
			// no avatar
			return nil, nil
		}
		s.logger.Error("Could not get user avatar (status)", slog.String("status", resp.Status))
		return nil, err
	}

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		s.logger.Error("Could not get user avatar (readall)", slog.String("error", err.Error()))
		return nil, err
	}
	return filesystem.NewFileFromBytes(b, "avatar")
}

func (s *TeamsModule) UpdateMicrosoftTeamMembership(ctx context.Context, e *core.RecordAuthWithOAuth2RequestEvent) error {

	membershipResp := struct {
		Value []struct {
			ID string `json:"id"`
		} `json:"value"`
	}{}
	err := doAzureJSON(ctx, s.logger, "GET",
		"https://graph.microsoft.com/v1.0/me/memberOf",
		e.OAuth2User.AccessToken,
		nil,
		&membershipResp)
	if err != nil {
		return err
	}

	for _, membership := range membershipResp.Value {

		exp := dbx.HashExp{
			"external_id": membership.ID,
		}

		records, err := s.cfg.App.FindAllRecords("teams",
			exp,
		)

		if err != nil {
			return err
		}

		for _, teamRecord := range records {
			t := TeamFromRecord(teamRecord)
			t.UpsertUser(ctx, e.Record.Id)
			err = s.UpsertTeam(ctx, t)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func doAzureJSON(ctx context.Context, logger *slog.Logger, method, url, token string, body io.Reader, v any) error {
	req, err := http.NewRequestWithContext(ctx,
		method,
		url, body)
	if err != nil {
		logger.Error("Could not create azure request", slog.String("error", err.Error()))
		return err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("ConsistencyLevel", "eventual")

	resp, err := utils.HTTPClient.Do(req)
	if err != nil {
		logger.Error("Could not issue azure request", slog.String("error", err.Error()))
		return err
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Could not issue azure request (readall)", slog.String("error", err.Error()))
		return err
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Could not issue azure request (statuscode):%s %s => %v - %s", method, url, resp.StatusCode, string(b))
	}

	if v != nil {
		err = json.Unmarshal(b, v)
		if err != nil {
			logger.Error("Could not issue azure request (unmarshal)", slog.String("error", err.Error()))
			return err
		}
	}
	return nil
}
