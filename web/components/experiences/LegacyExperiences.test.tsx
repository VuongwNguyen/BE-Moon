import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FallExperience } from "./FallExperience";
import { GalaxyMoonExperience } from "./GalaxyMoonExperience";

describe("legacy experiences", () => {
  it("loads the complete Galaxy viewer with the galaxy ID", () => {
    render(<GalaxyMoonExperience galaxyId="galaxy/a b" />);

    expect(screen.getByTitle("Galaxy experience").getAttribute("src")).toBe(
      "/galaxy-moon/index.html?galaxyId=galaxy%2Fa%20b",
    );
  });

  it("loads the complete Fall viewer with the galaxy ID", () => {
    render(<FallExperience galaxyId="fall/a b" />);

    expect(screen.getByTitle("Fall experience").getAttribute("src")).toBe(
      "/fall/index.html?galaxyId=fall%2Fa%20b",
    );
  });
});
