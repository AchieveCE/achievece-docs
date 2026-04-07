# AWS Cognito Authentication — AchieveCE Docs

The AchieveCE API documentation is protected by a dedicated AWS Cognito user pool. Two roles are supported:

- **admin** — sees every route, including `SEO — Admin` endpoints.
- **consumer** — sees Faculty and `SEO — Read` / `SEO — Write` routes only. Admin routes are stripped client-side from the OpenAPI spec before it's rendered.

## Resources

| Resource | Value |
| --- | --- |
| Region | `us-east-2` (matches the production RDS region) |
| User Pool ID | `us-east-2_0gKmcU86y` |
| User Pool Name | `achievece-docs-user-pool` |
| App Client ID | `3gs30hneto0ha0rsrbrt0ut3gj` |
| App Client Name | `achievece-docs-app-client` |
| Hosted UI Domain | `achievece-docs-auth.auth.us-east-2.amazoncognito.com` |
| Groups | `admin`, `consumer` |
| AWS Profile | `achievece` |

### App client config

- Public client (no secret), Authorization Code grant with PKCE
- Scopes: `openid`, `email`, `profile`
- Callback URLs:
  - `https://docs.achievece.com/callback`
  - `http://localhost:3003/callback`
- Logout URLs:
  - `https://docs.achievece.com`
  - `http://localhost:3003`
- Sign-up disabled (admin-only user creation)
- Password policy: 12+ chars, upper/lower/number/symbol

## Initial users

| Email | Group | Notes |
| --- | --- | --- |
| `info@achievece.com` | `admin` | Sees all routes |
| `tech@achievece.com` | `consumer` | Sees non-admin routes only |

Initial passwords were generated at provisioning time and shared with the project owner out-of-band. Rotate via the command below.

## How role filtering works

The frontend reads `cognito:groups` from the ID token. If the user is **not** in `admin`, any path whose operations are tagged with a prefix in `ADMIN_TAG_PREFIXES` (currently `SEO — Admin`) is removed from the OpenAPI spec before it's handed to Scalar. To add more admin tags, edit `ADMIN_TAG_PREFIXES` in `index.html`.

## Common operations

All commands use the `achievece` AWS profile and `us-east-2` region.

### Add a user

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --user-attributes Name=email,Value=user@achievece.com Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region us-east-2 --profile achievece

aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --password 'StrongPassword123!' \
  --permanent \
  --region us-east-2 --profile achievece

aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --group-name consumer \
  --region us-east-2 --profile achievece
```

### Promote a consumer to admin

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --group-name admin \
  --region us-east-2 --profile achievece
```

### Reset a password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --password 'NewPassword123!' \
  --permanent \
  --region us-east-2 --profile achievece
```

### List users

```bash
aws cognito-idp list-users \
  --user-pool-id us-east-2_0gKmcU86y \
  --region us-east-2 --profile achievece
```

### Delete a user

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id us-east-2_0gKmcU86y \
  --username user@achievece.com \
  --region us-east-2 --profile achievece
```

## Updating callback URLs

When adding new domains (e.g. a Vercel preview), update both lists at once — Cognito replaces the full set:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-2_0gKmcU86y \
  --client-id 3gs30hneto0ha0rsrbrt0ut3gj \
  --callback-urls "https://docs.achievece.com/callback" "https://achievece-docs.vercel.app/callback" "http://localhost:3003/callback" \
  --logout-urls "https://docs.achievece.com" "https://achievece-docs.vercel.app" "http://localhost:3003" \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --supported-identity-providers COGNITO \
  --region us-east-2 --profile achievece
```

Also keep `auth-config.js` in sync.

## Local development

```bash
bun install
bun run dev
# open http://localhost:3003
```

The dev server runs on port `3003`, which matches the registered Cognito callback URL.
