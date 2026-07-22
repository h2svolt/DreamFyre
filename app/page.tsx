import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, getSessionUser } from "./api/_lib/session";
import { isStaffRole } from "./api/_lib/permissions";
import { getRuntimeEnv } from "./api/_lib/runtime";
import { PlayerPlatform } from "./player-platform";
import { PublicHome } from "./public-site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  if (!cookieStore.get(COOKIE_NAME)) return <PublicHome />;
  let user;
  try {
    const env = await getRuntimeEnv();
    user = await getSessionUser(cookieStore, env.DB);
  } catch {
    return <PublicHome />;
  }
  if (!user) return <PublicHome />;
  if (isStaffRole(user.role)) redirect("/admin");
  return <PlayerPlatform initialAuthenticated />;
}
