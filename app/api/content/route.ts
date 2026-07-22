import { NextResponse } from "next/server";
import { getRuntimeEnv } from "../_lib/runtime";
import { initializeSchema, seedGames } from "../_lib/schema";
import { now } from "../_lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const env = await getRuntimeEnv();
    await initializeSchema(env.DB);
    await seedGames(env.DB);
    const timestamp = now();
    const [banners, promotions, pages, supportChannels] = await Promise.all([
      env.DB.prepare("SELECT id,title,message,cta_label AS ctaLabel,cta_url AS ctaUrl,image_url AS imageUrl FROM promotional_banners WHERE status='active' AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY updated_at DESC LIMIT 8").bind(timestamp, timestamp).all(),
      env.DB.prepare("SELECT id,code,title,description,reward_type AS rewardType,reward_amount AS rewardAmount,wager_requirement AS wagerRequirement FROM promotions WHERE status='active' AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY updated_at DESC LIMIT 30").bind(timestamp, timestamp).all(),
      env.DB.prepare("SELECT slug,title,body,updated_at AS updatedAt FROM cms_pages WHERE status='published'").all(),
      env.DB.prepare("SELECT id,label,channel_type AS channelType,destination FROM support_channel_configs WHERE enabled=1 AND destination IS NOT NULL AND trim(destination)<>'' ORDER BY CASE id WHEN 'gmail' THEN 1 WHEN 'facebook' THEN 2 WHEN 'instagram' THEN 3 WHEN 'whatsapp' THEN 4 ELSE 5 END").all(),
    ]);
    return NextResponse.json({ banners: banners.results, promotions: promotions.results, pages: pages.results, supportChannels: supportChannels.results }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ banners: [], promotions: [], pages: [], supportChannels: [] }, { headers: { "cache-control": "no-store" } });
  }
}
