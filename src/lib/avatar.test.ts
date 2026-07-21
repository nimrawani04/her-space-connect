import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      }),
    },
  },
}));

const { initials, getAvatarSignedUrl } = await import("./avatar");

describe("initials", () => {
  it("returns a flower for empty names", () => {
    expect(initials(null)).toBe("🌸");
    expect(initials("")).toBe("🌸");
  });

  it("returns up to two uppercase initials", () => {
    expect(initials("ada lovelace")).toBe("AL");
    expect(initials("grace brewster hopper")).toBe("GB");
    expect(initials("madonna")).toBe("M");
  });
});

describe("getAvatarSignedUrl", () => {
  it("returns null when path is missing", async () => {
    expect(await getAvatarSignedUrl(null)).toBeNull();
    expect(await getAvatarSignedUrl(undefined)).toBeNull();
  });

  it("returns a signed url for a valid path", async () => {
    expect(await getAvatarSignedUrl("me.png")).toBe("https://signed.example/me.png");
  });
});