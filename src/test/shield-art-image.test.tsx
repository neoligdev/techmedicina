import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ShieldArtCard } from "@/features/super-admin/shields/components/shield-art-card";
import { ShieldUploadModal } from "@/features/super-admin/shields/components/shield-upload-modal";
import { buildDefaultShieldCatalog } from "@/features/super-admin/shields/default-assets";

afterEach(cleanup);
const catalog = buildDefaultShieldCatalog();
const payload =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><input /></foreignObject></svg>';

it("stored art remains an image source instead of becoming application DOM", () => {
  const asset = { ...catalog["origem_active"]!, svgContent: payload };
  render(
    <ShieldArtCard
      assets={{ active: asset, earned: catalog["origem_earned"]!, locked: catalog["origem_locked"]! }}
      onEditAsset={() => {}}
    />,
  );
  const image = screen.getByRole("img", { name: asset.accessibilityLabel });
  expect(decodeURIComponent(image.getAttribute("src")!.split(",").slice(1).join(","))).toBe(
    payload,
  );
  expect(document.querySelector("script, foreignObject, input")).toBeNull();
});

it("upload comparison isolates existing stored art even before replacement validation", async () => {
  render(
    <ShieldUploadModal
      asset={{ ...catalog["origem_active"]!, svgContent: payload }}
      isOpen
      onClose={() => {}}
      onSave={() => {}}
    />,
  );
  const { fireEvent } = await import("@testing-library/react");
  fireEvent.change(screen.getByPlaceholderText(/<svg xmlns/), {
    target: { value: catalog["origem_active"]!.svgContent },
  });
  expect(screen.getByRole("img", { name: "Arte atual do Escudo" })).toHaveAttribute(
    "src",
    expect.stringContaining("data:image/svg+xml"),
  );
  expect(screen.getByRole("img", { name: "Prévia do novo Escudo" })).toBeInTheDocument();
  expect(document.querySelector("script, foreignObject, input")).toBeNull();
});
