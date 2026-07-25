interface FallExperienceProps {
  galaxyId: string;
}

export function FallExperience({ galaxyId }: FallExperienceProps) {
  return (
    <iframe
      src={`/fall/index.html?galaxyId=${encodeURIComponent(galaxyId)}`}
      title="Fall experience"
      allow="autoplay; fullscreen"
      style={{ display: "block", width: "100%", height: "100dvh", border: 0 }}
    />
  );
}
