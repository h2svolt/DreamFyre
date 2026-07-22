import { Login } from "../login";

export default async function AuthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const mode = query.mode === "register" ? "register" : "login";
  const staff = query.staff === "1";
  const error = typeof query.error === "string" ? query.error : undefined;
  const referralCode = typeof query.ref === "string" ? query.ref.slice(0, 40) : "";
  return <Login initialMode={mode} initialTab={staff ? "staff" : "player"} initialError={error} initialReferralCode={referralCode} />;
}
