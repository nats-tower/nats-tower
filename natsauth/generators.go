package natsauth

import (
	"context"

	jwt "github.com/nats-io/jwt/v2"
	"github.com/nats-io/nkeys"
	"github.com/pocketbase/pocketbase/core"
)

func generateOperatorRecord(_ context.Context,
	record *core.Record,
	url string) (*core.Record, error) {
	// create operator
	operatorKP, err := nkeys.CreateOperator()
	if err != nil {
		return nil, err
	}

	pubKey, err := operatorKP.PublicKey()
	if err != nil {
		return nil, err
	}

	privateKey, err := operatorKP.PrivateKey()
	if err != nil {
		return nil, err
	}

	seed, err := operatorKP.Seed()
	if err != nil {
		return nil, err
	}

	signingKeyPair, err := nkeys.CreatePair(nkeys.PrefixByteOperator)
	if err != nil {
		return nil, err
	}

	signPubKey, err := signingKeyPair.PublicKey()
	if err != nil {
		return nil, err
	}

	signPrivateKey, err := signingKeyPair.PrivateKey()
	if err != nil {
		return nil, err
	}

	signSeed, err := signingKeyPair.Seed()
	if err != nil {
		return nil, err
	}
	operatorClaims := jwt.NewOperatorClaims(pubKey)
	operatorClaims.SigningKeys.Add(signPubKey)

	jwtValue, err := operatorClaims.Encode(operatorKP)
	if err != nil {
		return nil, err
	}

	record.Set("url", url)
	record.Set("public_key", pubKey)
	record.Set("private_key", string(privateKey))
	record.Set("seed", string(seed))
	record.Set("sign_public_key", signPubKey)
	record.Set("sign_private_key", string(signPrivateKey))
	record.Set("sign_seed", string(signSeed))
	record.Set("jwt", jwtValue)
	return record, nil
}

func generateAccountRecord(_ context.Context,
	record *core.Record,
	operatorID,
	operatorSigningSeed,
	name,
	description string,
	limits jwt.OperatorLimits) (*core.Record, error) {
	// create account
	accountKP, err := nkeys.CreateAccount()
	if err != nil {
		return nil, err
	}

	pubKey, err := accountKP.PublicKey()
	if err != nil {
		return nil, err
	}

	privateKey, err := accountKP.PrivateKey()
	if err != nil {
		return nil, err
	}

	seed, err := accountKP.Seed()
	if err != nil {
		return nil, err
	}

	signingAccountKP, err := nkeys.CreateAccount()
	if err != nil {
		return nil, err
	}

	signPubKey, err := signingAccountKP.PublicKey()
	if err != nil {
		return nil, err
	}

	signPrivateKey, err := signingAccountKP.PrivateKey()
	if err != nil {
		return nil, err
	}

	signSeed, err := signingAccountKP.Seed()
	if err != nil {
		return nil, err
	}
	accountClaims := jwt.NewAccountClaims(pubKey)
	accountClaims.Name = name
	accountClaims.SigningKeys.Add(signPubKey)

	if name == "SYS" {
		// Sys Account does NOT use JetStream instead has some exports!
		accountClaims.Exports = jwt.Exports{&jwt.Export{
			Name:                 "account-monitoring-services",
			Subject:              "$SYS.REQ.ACCOUNT.*.*",
			Type:                 jwt.Service,
			ResponseType:         jwt.ResponseTypeStream,
			AccountTokenPosition: 4,
			Info: jwt.Info{
				Description: `Request account specific monitoring services for: SUBSZ, CONNZ, LEAFZ, JSZ and INFO`,
				InfoURL:     "https://docs.nats.io/nats-server/configuration/sys_accounts",
			},
		}, &jwt.Export{
			Name:                 "account-monitoring-streams",
			Subject:              "$SYS.ACCOUNT.*.>",
			Type:                 jwt.Stream,
			AccountTokenPosition: 3,
			Info: jwt.Info{
				Description: `Account specific monitoring stream`,
				InfoURL:     "https://docs.nats.io/nats-server/configuration/sys_accounts",
			},
		}}
	} else {
		accountClaims.Limits = limits
	}

	operatorKP, err := nkeys.FromSeed([]byte(operatorSigningSeed))
	if err != nil {
		return nil, err
	}

	jwtValue, err := accountClaims.Encode(operatorKP)
	if err != nil {
		return nil, err
	}

	record.Set("name", name)
	record.Set("description", description)
	record.Set("operator", operatorID)
	record.Set("public_key", pubKey)
	record.Set("private_key", string(privateKey))
	record.Set("seed", string(seed))
	record.Set("sign_public_key", signPubKey)
	record.Set("sign_private_key", string(signPrivateKey))
	record.Set("sign_seed", string(signSeed))
	record.Set("jwt", jwtValue)
	return record, nil
}

func generateUserRecord(_ context.Context,
	record *core.Record,
	accountID, accountPubKey, accountSigningSeed string, name string) (*core.Record, error) {
	// create user
	userKP, err := nkeys.CreateUser()
	if err != nil {
		return nil, err
	}

	pubKey, err := userKP.PublicKey()
	if err != nil {
		return nil, err
	}

	privateKey, err := userKP.PrivateKey()
	if err != nil {
		return nil, err
	}

	seed, err := userKP.Seed()
	if err != nil {
		return nil, err
	}
	userClaims := jwt.NewUserClaims(pubKey)
	userClaims.Name = name
	userClaims.IssuerAccount = accountPubKey

	// TODO move limits to separate collection
	// TODO move permissions to separate collection

	accountKP, err := nkeys.FromSeed([]byte(accountSigningSeed))
	if err != nil {
		return nil, err
	}

	jwtValue, err := userClaims.Encode(accountKP)
	if err != nil {
		return nil, err
	}
	creds, err := jwt.FormatUserConfig(jwtValue, seed)
	if err != nil {
		return nil, err
	}

	record.Set("name", name)
	record.Set("account", accountID)
	record.Set("public_key", pubKey)
	record.Set("private_key", string(privateKey))
	record.Set("seed", string(seed))
	record.Set("jwt", jwtValue)
	record.Set("creds", creds)
	return record, nil
}
