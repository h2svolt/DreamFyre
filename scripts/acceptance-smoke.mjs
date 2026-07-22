// Run only against a fresh local/test database. Never point this destructive
// acceptance workflow at production.
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3123";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD for the fresh test database.");

class Client {
  cookie = "";
  async request(path, options = {}) {
    const headers = new Headers(options.headers ?? {});
    if (this.cookie) headers.set("cookie", this.cookie);
    const response = await fetch(`${base}${path}`, { ...options, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const session = setCookie.match(/df_session=([^;]*)/);
      if (session) this.cookie = session[1] ? `df_session=${session[1]}` : "";
    }
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
    return { status: response.status, body };
  }
  post(path, payload) {
    return this.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  }
}

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
}

async function expectOk(result, label) {
  assert(result.status >= 200 && result.status < 300, label, result);
  return result.body;
}

const admin = new Client();
const inviter = new Client();
const player = new Client();
const suffix = Date.now().toString(36);
const playerPassword = "LocalPlayer!2026";

await expectOk(await admin.post("/api/auth", { action: "register", email: adminEmail, password: adminPassword, displayName: "Smoke Super", ageConfirmed: true }), "register super admin");
const seededAdmin = await expectOk(await admin.request("/api/admin"), "load seeded provider and payment configuration");
const seededOrion = seededAdmin.games.find((item) => item.id === "orion-stars");
assert(seededOrion?.launchUrl === "http://start.orionstars.vip:8580/index.html", "Orion player URL was not seeded", seededOrion);
assert(seededOrion?.adminUrl === "https://orionstars.vip:8781/", "Orion staff-only admin URL was not seeded", seededOrion);
assert(seededAdmin.games.length === 31, "complete client game directory was not seeded", seededAdmin.games.length);
assert(seededAdmin.games.filter((item) => item.launchUrl).length === 28, "supplied player URL set was not seeded", seededAdmin.games);
assert(seededAdmin.games.filter((item) => item.adminUrl).length === 28, "supplied staff-only admin URL set was not seeded", seededAdmin.games);
assert(seededAdmin.paymentMethods.find((item) => item.id === "paypal")?.paymentUrl === "https://taptapup.com/cashme/nex-play-paytap/", "PayPal link was not seeded", seededAdmin.paymentMethods);
assert(seededAdmin.paymentMethods.find((item) => item.id === "chime")?.destination === "$Isaiah-Santiago-65", "Chime tag was not seeded", seededAdmin.paymentMethods);
assert(seededAdmin.paymentMethods.find((item) => item.id === "venmo")?.enabled === 0, "Venmo should remain coming soon", seededAdmin.paymentMethods);
assert(seededAdmin.supportChannels.find((item) => item.id === "facebook")?.destination === "https://www.facebook.com/share/1Ae4DF9Rnf/", "Facebook support link was not seeded", seededAdmin.supportChannels);
assert(seededAdmin.supportChannels.find((item) => item.id === "instagram")?.destination === "https://www.instagram.com/dream.fyre234/", "Instagram support link was not seeded", seededAdmin.supportChannels);
await expectOk(await inviter.post("/api/auth", { action: "register", email: `inviter-${suffix}@dreamfyre.test`, password: playerPassword, displayName: "Referral Host", ageConfirmed: true }), "register inviter");
const inviterStart = await expectOk(await inviter.request("/api/platform"), "load inviter");
await expectOk(await player.post("/api/auth", { action: "register", email: `invited-${suffix}@dreamfyre.test`, password: playerPassword, displayName: "Invited Player", ageConfirmed: true, referralCode: inviterStart.user.referralCode }), "register invited player");

const emailChallenge = await expectOk(await player.post("/api/auth", { action: "request_email_verification" }), "request email verification");
await expectOk(await player.post("/api/auth", { action: "verify_email", challengeId: emailChallenge.challengeId, code: emailChallenge.previewCode }), "verify email");
const smokePlayerTag = `Smoke_${suffix}`.slice(0, 24);
await expectOk(await player.post("/api/account", { action: "update_profile", displayName: "Invited Player Updated", email: `invited-${suffix}@dreamfyre.test`, playerTag: smokePlayerTag, currentPassword: playerPassword, phone: "+1 555 0100", ageConfirmed: true }), "update player profile");
const updatedProfile = await expectOk(await player.request("/api/account"), "load updated player profile");
assert(updatedProfile.user.playerTag === smokePlayerTag && updatedProfile.profile.phone === "+1 555 0100", "profile username or phone was not saved", updatedProfile);

await expectOk(await admin.post("/api/admin", { action: "super_update_game_link", gameId: "fire-kirin", launchUrl: "https://example.com/fire-kirin-player" }), "configure central game URL");
await expectOk(await admin.post("/api/admin", { action: "super_update_payment_link", methodId: "cash-app", paymentUrl: "https://example.com/cash-app-checkout" }), "configure central payment link");
await expectOk(await admin.post("/api/admin", { action: "super_update_support_channel", channelId: "gmail", destination: "support@example.com", enabled: true }), "configure support email");
const accountRequest = await expectOk(await player.post("/api/platform", { action: "create_game_account", gameId: "fire-kirin" }), "request game account");
await expectOk(await admin.post("/api/admin", { action: "staff_update_game_request", requestId: accountRequest.requestId, status: "completed", gameUsername: `FK-${suffix}`, temporaryPassword: "ProviderPass!77", providerReference: `acct-${suffix}` }), "complete game account");

let playerSnapshot = await expectOk(await player.request("/api/platform"), "load active player account");
assert(playerSnapshot.paymentMethods.find((item) => item.id === "cash-app")?.paymentUrl === "https://example.com/cash-app-checkout", "payment link was not returned to the player", playerSnapshot.paymentMethods);
assert(playerSnapshot.paymentMethods.find((item) => item.id === "chime")?.destination === "$Isaiah-Santiago-65", "destination-based Chime details were not returned", playerSnapshot.paymentMethods);
assert(playerSnapshot.paymentMethods.find((item) => item.id === "chime")?.qrImageUrl === "/assets/payments/chime-isaiah-santiago.png", "Chime QR image was not returned", playerSnapshot.paymentMethods);
assert(playerSnapshot.supportChannels.some((item) => item.id === "gmail" && item.destination === "support@example.com"), "support channel was not returned to the player", playerSnapshot.supportChannels);
const account = playerSnapshot.gameAccounts.find((item) => item.gameId === "fire-kirin");
assert(account?.username === `FK-${suffix}`, "completed Game ID was not returned", account);
assert(account?.launchUrl === "https://example.com/fire-kirin-player", "central game URL was not attached", account);
const reveal = await expectOk(await player.post("/api/platform", { action: "reveal_game_password", accountId: account.id }), "reveal encrypted game password");
assert(reveal.password === "ProviderPass!77", "revealed password mismatch");
const launch = await expectOk(await player.post("/api/platform", { action: "record_game_launch", accountId: account.id }), "record game launch");
assert(launch.launchUrl === "https://example.com/fire-kirin-player", "launch action returned wrong URL", launch);

const forbidden = await admin.post("/api/platform", { action: "create_game_account", gameId: "fire-kirin" });
assert(forbidden.status === 403, "staff gameplay route was not blocked", forbidden);

const form = new FormData();
form.set("proof", new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])], { type: "image/png" }), "smoke-proof.png");
const proof = await expectOk(await player.request("/api/payment-proof", { method: "POST", body: form }), "upload payment proof");
const deposit = await expectOk(await player.post("/api/platform", { action: "create_deposit", amount: 25, method: "Chime", gameId: "fire-kirin", gameUsername: account.username, proofKey: proof.key }), "create destination-based Chime deposit request");
await expectOk(await admin.post("/api/admin", { action: "staff_update_game_request", requestId: deposit.requestId, status: "completed", gameUsername: account.username, providerReference: `deposit-${suffix}` }), "complete deposit");

const inviterAfter = await expectOk(await inviter.request("/api/platform"), "load referral result");
assert(inviterAfter.wallet.referralBalance === 5, "referral reward was not issued", inviterAfter.wallet);
assert(inviterAfter.referrals.some((item) => item.status === "qualified"), "referral did not qualify", inviterAfter.referrals);

playerSnapshot = await expectOk(await player.request("/api/platform"), "reload credited game account");
const credited = playerSnapshot.gameAccounts.find((item) => item.id === account.id);
assert(credited.balance === 25, "game credits were not recorded", credited);
const redeem = await expectOk(await player.post("/api/platform", { action: "request_game_credit_withdrawal", accountId: account.id, amount: 10 }), "request game credit redemption");
await expectOk(await admin.post("/api/admin", { action: "staff_update_game_request", requestId: redeem.requestId, status: "completed", providerReference: `redeem-${suffix}` }), "complete game credit redemption");

const verification = await expectOk(await player.post("/api/account", { action: "request_verification", verificationType: "identity", documentType: "test-reference", reference: `kyc-${suffix}`, note: "Automated local acceptance test" }), "submit KYC review");
await expectOk(await admin.post("/api/admin", { action: "admin_update_verification", verificationId: verification.requestId, status: "approved", note: "Approved for local smoke test" }), "approve KYC review");
await expectOk(await player.post("/api/platform", { action: "create_withdrawal", amount: 10, method: "Cash App", destination: "smoke-cash-app" }), "create withdrawal");
const withdrawalQueue = await expectOk(await admin.request("/api/admin"), "load withdrawal queue");
const withdrawal = withdrawalQueue.withdrawalQueue.find((item) => item.email === `invited-${suffix}@dreamfyre.test` && item.amount === 10);
assert(withdrawal?.id, "withdrawal did not reach the finance queue", withdrawalQueue.withdrawalQueue);
await expectOk(await admin.post("/api/admin", { action: "staff_update_withdrawal", withdrawalId: withdrawal.id, status: "completed" }), "complete withdrawal");

await expectOk(await admin.post("/api/admin", { action: "admin_save_promotion", title: "Smoke reward", description: "Local acceptance reward", code: `SMOKE${suffix.toUpperCase()}`, rewardType: "freeplay", rewardAmount: 3, status: "active", wagerRequirement: 0 }), "save promotion");
await expectOk(await player.post("/api/account", { action: "claim_promotion", code: `SMOKE${suffix.toUpperCase()}` }), "claim promotion");
await expectOk(await admin.post("/api/admin", { action: "admin_save_banner", title: "Smoke banner", message: "Public content is connected.", ctaLabel: "View games", ctaUrl: "/games", status: "active" }), "save homepage banner");
await expectOk(await admin.post("/api/admin", { action: "admin_save_cms_page", slug: "terms", title: "Smoke terms", pageBody: "Local acceptance content only.", status: "published" }), "publish legal CMS page");
await expectOk(await admin.post("/api/admin", { action: "admin_broadcast_notification", notificationType: "maintenance", title: "Smoke notice", message: "Acceptance workflow completed." }), "broadcast notification");

for (let attempt = 0; attempt < 5; attempt += 1) await admin.post("/api/auth", { action: "login", email: adminEmail, password: "wrong-password", expectedRole: "staff" });
const adminSnapshot = await expectOk(await admin.request("/api/admin"), "load admin report");
assert(adminSnapshot.fraudAlerts.some((item) => item.alertType === "repeated_login_failures"), "repeated-login fraud alert missing", adminSnapshot.fraudAlerts);
const content = await expectOk(await new Client().request("/api/content"), "load public content");
assert(content.banners.some((item) => item.title === "Smoke banner"), "homepage banner was not public", content.banners);
assert(content.pages.some((item) => item.slug === "terms" && item.title === "Smoke terms"), "published CMS page was not public", content.pages);
assert(content.supportChannels.some((item) => item.id === "gmail"), "configured support channel was not public", content.supportChannels);

console.log(JSON.stringify({
  status: "passed",
  gameAccount: account.username,
  centralPlayUrl: launch.launchUrl,
  referralBalance: inviterAfter.wallet.referralBalance,
  paymentMethod: "Chime",
  paymentLink: "https://example.com/cash-app-checkout",
  staffGameplayStatus: forbidden.status,
  fraudAlert: "repeated_login_failures",
  publicBanner: "Smoke banner",
}, null, 2));
