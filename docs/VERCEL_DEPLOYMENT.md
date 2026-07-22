# Deploy DreamFyre to Vercel

## 1. Create an empty Turso database

Vercel functions cannot safely use an uploaded/local SQLite file because their filesystem is temporary. Create a new empty Turso/libSQL database. Do not upload dreamfyre-local-starter.db; DreamFyre creates and seeds its own schema on the first API request.

From Turso, obtain:

- a database URL beginning with libsql://
- a database authentication token

CLI example:

    turso db create dreamfyre
    turso db show --url dreamfyre
    turso db tokens create dreamfyre

If the Turso dashboard asks for a group name, use lowercase letters/numbers/dashes, for example dreamfyre-group. The prior “journal_mode=WAL” upload error is avoided by using a new empty database.

## 2. Generate the permanent encryption key

Run once:

    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

Store the output in a password/secret manager. Do not change it after live game credentials exist; old encrypted passwords depend on it.

## 3. Add Vercel environment variables

Open Project → Settings → Environment Variables. The left field is the Key and the right field is its Value. Do not paste a libsql:// address into the Key field.

| Key | Value | Required |
| --- | --- | --- |
| TURSO_DATABASE_URL | Full libsql:// database address | Yes |
| TURSO_AUTH_TOKEN | Turso token | Yes |
| ADMIN_EMAILS | Super-admin emails, comma-separated | Yes |
| GAME_CREDENTIAL_ENCRYPTION_KEY | Generated base64 key | Yes |
| RESEND_API_KEY | Resend production key | For live email codes |
| EMAIL_FROM | Verified sender, for example DreamFyre <login@domain.com> | For live email codes |
| AUTH_PREVIEW_OTP | false | Yes in production |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Google OAuth application | Optional |
| MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET | Microsoft OAuth application | Optional |
| APPLE_CLIENT_ID / APPLE_CLIENT_SECRET | Apple Sign In application | Optional |

Optional FRAUD_FAILED_LOGIN_THRESHOLD, FRAUD_LARGE_TRANSFER_THRESHOLD, FRAUD_LARGE_DEPOSIT_THRESHOLD and FRAUD_LARGE_WITHDRAWAL_THRESHOLD values tune the built-in review alerts. Defaults are documented in .env.example.

Set NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_SUPPORT_WHATSAPP_URL when the client approves those public channels. Because NEXT_PUBLIC values are included in the browser build, redeploy after changing them and never put a secret in either value.

Select Production and also Preview if the client will test Preview deployments. Save, then explicitly redeploy—the running deployment does not automatically receive newly added values.

## 4. Upload the correct project root

### GitHub method

1. Extract the delivered ZIP.
2. Create a private GitHub repository.
3. Upload the contents of the folder where package.json is located.
4. Do not upload node_modules, .next, .env files or local .db files.
5. Import the repository at Vercel → Add New → Project.
6. Confirm Framework Preset is Next.js and Build Command is npm run build.
7. Add the environment variables and deploy.

### Vercel Drop method

Do not drag the ZIP itself. Extract it and drag the folder that directly contains package.json, app, public and vercel.json. If the build log never runs next build and the site shows 404 NOT_FOUND, the wrong folder was uploaded.

### CLI method

    npm install
    npm install -g vercel
    vercel login
    vercel
    vercel --prod

## 5. Create the first super administrator

1. Add the intended email to ADMIN_EMAILS and redeploy.
2. Open /auth, select Player and create an account with that exact email.
3. The server assigns super_admin and redirects it to /admin.
4. If that email already registered as a player, sign out/in after adding it to ADMIN_EMAILS; the next login promotes it.
5. In Admin → Users, create separate Support, Game Operations, Finance and Admin accounts.

Never ship a hardcoded default admin password. Choose a unique password during registration and enable email 2FA after email delivery is configured.

## 6. Configure social sign-in

Register these exact production callbacks with the identity providers:

    https://YOUR_DOMAIN/api/oauth/google/callback
    https://YOUR_DOMAIN/api/oauth/microsoft/callback
    https://YOUR_DOMAIN/api/oauth/apple/callback

Add Preview callback URLs separately if the provider permits them. Redeploy after adding each pair of credentials.

## 7. Configure shared game, payment and support links

1. Sign in as super admin.
2. Open Platform Links and save one official URL per game when the client supplies it.
3. In Platform Links, verify the supplied Facebook and Instagram pages, then add approved Gmail/WhatsApp destinations and enable only those ready for players.
4. Open Payments and enable/configure only receiving methods the finance team can reconcile.
5. As super admin, add the current payment/checkout link for every enabled method. Players cannot submit a deposit for a method without its link.
6. Game Operations then enters only player Game ID/password/reference when fulfilling an account.

## 8. Production email

Verify the sending domain in Resend, add RESEND_API_KEY and EMAIL_FROM, keep AUTH_PREVIEW_OTP=false, and redeploy. Test verification, forgot password and 2FA delivery. Without email configuration those actions return a clear configuration error instead of exposing a code.

## 9. Local development

Create .env.local:

    TURSO_DATABASE_URL=file:./dreamfyre-local.db
    TURSO_AUTH_TOKEN=
    ADMIN_EMAILS=developer@example.com
    GAME_CREDENTIAL_ENCRYPTION_KEY=PASTE_GENERATED_KEY
    AUTH_PREVIEW_OTP=true

Then:

    npm install
    npm run dev

Preview OTP is appropriate only on a private local/testing system.

## Troubleshooting

### “TURSO_DATABASE_URL is not configured”

- Confirm the environment-variable Key is exactly TURSO_DATABASE_URL.
- Put the libsql:// address in Value, not Key.
- Apply it to the deployment environment being opened.
- Redeploy after saving it.

### “Invalid email or password” for the intended admin

- ADMIN_EMAILS does not create a password/account by itself.
- Register that exact email first, then use the password chosen at registration.
- If it existed before configuration, sign out/in after redeployment.

### Login returns immediately to the public page

- Use the Vercel HTTPS domain and avoid switching between www/non-www.
- Clear obsolete cookies after moving domains.
- Check /api/auth and Vercel logs for database configuration failures.

### Game account is active but Play is disabled

- This is expected until the super admin saves that title’s official URL in Platform Links.
- Staff completing a player account does not enter a URL.

### Existing game password cannot be revealed

- Restore the original GAME_CREDENTIAL_ENCRYPTION_KEY.
- Key rotation requires a controlled migration that decrypts/re-encrypts every stored credential.

### Social login says it is waiting for operator credentials

- Add both the provider client ID and secret.
- Verify the callback URL exactly matches the deployed domain.
- Redeploy.
