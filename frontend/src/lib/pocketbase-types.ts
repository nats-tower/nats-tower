/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	NatsAuthAccounts = "nats_auth_accounts",
	NatsAuthLimits = "nats_auth_limits",
	NatsAuthOperators = "nats_auth_operators",
	NatsAuthUsers = "nats_auth_users",
	Teams = "teams",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type NatsAuthAccountsRecord = {
	description?: string
	id: string
	jwt?: string
	limits?: RecordIdString
	name: string
	operator: RecordIdString
	private_key?: string
	public_key?: string
	seed?: string
	sign_private_key?: string
	sign_public_key?: string
	sign_seed?: string
	teams?: RecordIdString[]
}

export enum NatsAuthLimitsTypeOptions {
	"account" = "account",
}
export type NatsAuthLimitsRecord = {
	default?: boolean
	id: string
	jetstream_max_disk: number
	jetstream_max_memory: number
	max_connections: number
	name: string
	operator: RecordIdString
	type: NatsAuthLimitsTypeOptions
}

export type NatsAuthOperatorsRecord = {
	description?: string
	id: string
	jwt?: string
	private_key?: string
	public_key?: string
	seed?: string
	sign_private_key?: string
	sign_public_key?: string
	sign_seed?: string
	teams?: RecordIdString[]
	url: string
}

export type NatsAuthUsersRecord = {
	account: RecordIdString
	bearer?: boolean
	creds?: string
	description?: string
	id: string
	jwt?: string
	name: string
	private_key?: string
	public_key?: string
	seed?: string
}

export type TeamsRecord = {
	created?: IsoDateString
	external?: boolean
	external_id?: string
	id: string
	members?: RecordIdString[]
	name: string
	updated?: IsoDateString
}

export type UsersRecord<Tpreferences = unknown> = {
	avatar?: string
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	preferences?: null | Tpreferences
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type NatsAuthAccountsResponse<Texpand = unknown> = Required<NatsAuthAccountsRecord> & BaseSystemFields<Texpand>
export type NatsAuthLimitsResponse<Texpand = unknown> = Required<NatsAuthLimitsRecord> & BaseSystemFields<Texpand>
export type NatsAuthOperatorsResponse<Texpand = unknown> = Required<NatsAuthOperatorsRecord> & BaseSystemFields<Texpand>
export type NatsAuthUsersResponse<Texpand = unknown> = Required<NatsAuthUsersRecord> & BaseSystemFields<Texpand>
export type TeamsResponse<Texpand = unknown> = Required<TeamsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Tpreferences = unknown, Texpand = unknown> = Required<UsersRecord<Tpreferences>> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	nats_auth_accounts: NatsAuthAccountsRecord
	nats_auth_limits: NatsAuthLimitsRecord
	nats_auth_operators: NatsAuthOperatorsRecord
	nats_auth_users: NatsAuthUsersRecord
	teams: TeamsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	nats_auth_accounts: NatsAuthAccountsResponse
	nats_auth_limits: NatsAuthLimitsResponse
	nats_auth_operators: NatsAuthOperatorsResponse
	nats_auth_users: NatsAuthUsersResponse
	teams: TeamsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'nats_auth_accounts'): RecordService<NatsAuthAccountsResponse>
	collection(idOrName: 'nats_auth_limits'): RecordService<NatsAuthLimitsResponse>
	collection(idOrName: 'nats_auth_operators'): RecordService<NatsAuthOperatorsResponse>
	collection(idOrName: 'nats_auth_users'): RecordService<NatsAuthUsersResponse>
	collection(idOrName: 'teams'): RecordService<TeamsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
