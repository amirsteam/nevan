import { describe, it, expect } from "vitest";
import { brandLogoFor } from "./brandLogos";

describe("brandLogoFor", () => {
  it("finds the brand logo by slug, or by name if the slug was changed", () => {
    expect(brandLogoFor({ slug: "nevan-collection", name: "Anything" })).toMatchObject({ alt: "Nevan Collection logo", round: true });
    expect(brandLogoFor({ slug: "nevan-sprouts", name: "" })).toMatchObject({ alt: "Nevan Sprouts logo", round: false });
    expect(brandLogoFor({ slug: "baby-wear-2", name: "Nevan Sprouts" })?.alt).toBe("Nevan Sprouts logo");
  });

  it("returns nothing for other categories", () => {
    expect(brandLogoFor({ slug: "rompers", name: "Rompers" })).toBeNull();
  });
});
