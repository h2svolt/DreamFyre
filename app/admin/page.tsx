import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "../api/_lib/session";
import { isStaffRole } from "../api/_lib/permissions";
import { getRuntimeEnv } from "../api/_lib/runtime";
import { AdminConsole } from "./admin-console";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const env = await getRuntimeEnv();
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore, env.DB);
  if (!user || !isStaffRole(user.role)) redirect("/");
  return <AdminConsole role={user.role} />;
}
