import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { refreshAccessToken, getAccessToken, setAccessToken } from "./axios";

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it("shares one refresh request between concurrent callers", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { accessToken: "new-token" } },
    });

    const results = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results).toEqual(["new-token", "new-token", "new-token"]);
    expect(getAccessToken()).toBe("new-token");
  });

  it("sends the refresh cookie and never a body token", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { accessToken: "t" } },
    });

    await refreshAccessToken();

    const [url, body, config] = post.mock.calls[0];
    expect(url).toMatch(/\/auth\/refresh-token$/);
    expect(body).toEqual({});
    expect(config).toMatchObject({ withCredentials: true });
  });

  it("clears the in-memory token when refresh fails", async () => {
    setAccessToken("old");
    vi.spyOn(axios, "post").mockRejectedValue(new Error("401"));

    expect(await refreshAccessToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("keeps tokens out of localStorage", async () => {
    vi.spyOn(axios, "post").mockResolvedValue({ data: { data: { accessToken: "t" } } });
    await refreshAccessToken();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });
});
