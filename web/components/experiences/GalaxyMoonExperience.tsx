interface GalaxyMoonExperienceProps {
  galaxyId: string;
}

export function GalaxyMoonExperience({ galaxyId }: GalaxyMoonExperienceProps) {
  return (
    <iframe
      src={`/galaxy-moon/index.html?galaxyId=${encodeURIComponent(galaxyId)}`}
      title="Galaxy experience"
      allow="autoplay; fullscreen"
      style={{ display: "block", width: "100%", height: "100dvh", border: 0 }}
    />
  );
}
