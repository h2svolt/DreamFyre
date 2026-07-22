import { redirect } from "next/navigation";

export default async function ReferralJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/auth?mode=register&ref=${encodeURIComponent(code.trim().slice(0, 40))}`);
}
