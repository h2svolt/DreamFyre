# Client acceptance test

Use a Vercel Preview, test payment accounts only, and two separate browser profiles: one player and one staff/super admin.

## A. Public and mobile

- Open / while signed out; homepage and real game artwork load without authentication.
- Search/filter /games and click Play; it asks for sign-in.
- Search promotions and FAQ items.
- Check homepage, auth, player portal and admin on a real phone in portrait and landscape.
- Confirm navigation, game cards, forms and action buttons do not overflow or become unreadably compact.

## B. Authentication and account

- Register a player with legal-age confirmation.
- Verify email through the delivered code.
- Sign out and back in; refresh and confirm the session remains valid.
- Request a password reset and use the emailed code.
- Enable email 2FA, sign out, and confirm the next login needs a code.
- Edit profile/contact details and upload an avatar.
- Review login/device history and revoke a test device.

If OAuth credentials are configured, repeat registration/login using Google, Apple and Microsoft.

## C. Game account and embedded link

- Confirm the supplied player and provider-admin links appear under Platform Links, then replace one title with harmless HTTP/HTTPS test URLs.
- As player, request that game.
- Confirm the pending card shows the creation loader and no ID/password.
- As Game Operations, complete with a test Game ID/password/reference; verify there is no URL field.
- As player, refresh and confirm the Game ID appears and password remains protected.
- Reveal/copy the password.
- Click Play and confirm it opens the centrally configured URL, not Support.
- Remove the central URL and confirm Play changes to Link coming soon.
- Confirm a staff account receives 403 from player gameplay actions.

## D. Payments and wallet

- Confirm PayPal, Cash App, Google Pay and Apple Pay show their supplied links; Chime shows its tag/QR; USDT shows its TRC20 destination; Venmo, Stripe and Card remain Coming Soon.
- As super admin, replace one link with a harmless test payment URL and verify the change reaches the player form.
- As Finance/Admin, configure and enable the test method and its instructions.
- As player, test one link-based method and one destination-based method, then submit a small deposit with a test proof image.
- As staff, view the private proof, mark processing and then complete with a reference.
- Confirm transaction/player notifications update.
- Complete KYC approval, create a withdrawal and verify reserve/reject behavior.
- Transfer a small amount between two test players and confirm both ledgers.
- Change the method link as super admin, refresh the player form and confirm the new link appears without redeployment.

Never use a real card, wallet or cryptocurrency transfer during acceptance unless a live gateway contract and test plan explicitly authorize it.

## E. Referral and promotions

- Copy Player A’s /join/[code] referral link.
- Register Player B through it.
- Complete Player B’s first deposit as staff.
- Confirm Player A receives one referral reward and notification.
- Repeat another deposit and confirm no duplicate referral reward.
- Create a promotion/code as admin and claim it from the player Account Center.

## F. Admin roles and content

- Super admin creates one account for each role.
- Confirm Support can message players but cannot process games/payments.
- Confirm Game Operations can process game requests but cannot play.
- Confirm Finance can process withdrawals/payment settings but cannot create staff.
- Publish a test banner and legal page; confirm public content updates.
- Broadcast a test notification and confirm players receive it.
- Review reports, fraud queue and audit records.

## G. Responsible gaming and security

- Set a deposit limit and confirm a larger deposit is blocked server-side.
- Submit KYC and verify admin approval controls withdrawal eligibility.
- Test timed self-exclusion with a disposable account; confirm it is signed out/blocked.
- Suspend a disposable account and confirm all its sessions stop working.

## Release gate

Run from the project root:

    npm test

An API-level acceptance script is also included. It creates data and therefore must run only against a fresh local/test database. Start the built app with a fresh database and matching ADMIN_EMAILS, then in another terminal run:

    SMOKE_BASE_URL=http://127.0.0.1:3000 \
    SMOKE_ADMIN_EMAIL=smoke-super@dreamfyre.test \
    SMOKE_ADMIN_PASSWORD='choose-a-test-password' \
    npm run smoke

The script verifies central game links, staff fulfilment, credential encryption/reveal, staff gameplay blocking, payment proof/deposit, referral reward, game-credit redemption, KYC/withdrawal, promotions, public CMS content, broadcasts and repeated-login fraud alerts.

Do not approve production until this command passes, mobile testing passes on the client’s target devices, all external integrations have their own sandbox tests, and legal/security/compliance sign-off is recorded.
