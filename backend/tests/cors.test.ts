/**
 * Which browser origins the API trusts with credentials
 */
import corsOptions from "../config/cors";

const allows = (origin: string) =>
  new Promise<boolean>((resolve) => {
    (corsOptions.origin as (o: string, cb: (err: Error | null, ok?: boolean) => void) => void)(origin, (err, ok) =>
      resolve(!err && Boolean(ok)),
    );
  });

describe("CORS allow-list", () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, FRONTEND_URL: process.env.FRONTEND_URL };
  afterEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV;
    process.env.FRONTEND_URL = saved.FRONTEND_URL;
  });

  it("trusts the shop's own sites, and local dev servers only outside production", async () => {
    process.env.FRONTEND_URL = "https://nevanhandicraft.com.np,https://www.nevanhandicraft.com.np";

    process.env.NODE_ENV = "production";
    expect(await allows("https://nevanhandicraft.com.np")).toBe(true);
    expect(await allows("https://www.nevanhandicraft.com.np")).toBe(true);
    expect(await allows("http://localhost:5173")).toBe(false);
    expect(await allows("https://evil.example")).toBe(false);

    process.env.NODE_ENV = "development";
    expect(await allows("http://localhost:5173")).toBe(true);
  });
});
