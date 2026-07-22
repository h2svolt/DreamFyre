import { notFound } from "next/navigation";
import { PublicLegal } from "../../public-site";

const pages = new Set(["terms", "privacy", "responsible-gaming", "cookies", "disclaimer"]);

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pages.has(slug)) notFound();
  return <PublicLegal slug={slug}/>;
}
