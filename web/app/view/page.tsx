// web/app/view/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchGalaxyView, fetchGalleryItems, firstGalleryImage } from "@/lib/api/galaxyApi";
import { GalaxyMoonExperience } from "@/components/experiences/GalaxyMoonExperience";
import { FallExperience } from "@/components/experiences/FallExperience";
import { StoryExperience } from "@/components/experiences/StoryExperience";

interface ViewPageProps {
  searchParams: Promise<{ galaxyId?: string; skip_se?: string }>;
}

export async function generateMetadata({ searchParams }: ViewPageProps): Promise<Metadata> {
  const { galaxyId } = await searchParams;
  if (!galaxyId) return {};

  const view = await fetchGalaxyView(galaxyId);
  if (!view) return {};

  const items = await fetchGalleryItems(galaxyId);
  const firstPhoto = firstGalleryImage(items);
  const name = view.name || "Lumora";
  const title = `${name} — Lumora`;
  const description = `Explore the memory galaxy "${name}" in stunning 3D space.`;
  const ogImage = firstPhoto || "/og-image.png";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Lumora",
      title,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ViewPage({ searchParams }: ViewPageProps) {
  const { galaxyId, skip_se: skipSe } = await searchParams;
  if (!galaxyId) notFound();

  const view = await fetchGalaxyView(galaxyId);
  if (!view) notFound();

  const useStory = Boolean(view.storyType) && skipSe !== "true";
  if (useStory) {
    return <StoryExperience galaxyId={galaxyId} />;
  }

  const template = view.template || "galaxy";
  if (template === "fall") {
    return <FallExperience galaxyId={galaxyId} />;
  }
  return <GalaxyMoonExperience galaxyId={galaxyId} />;
}
