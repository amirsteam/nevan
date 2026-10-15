/**
 * Connection-string helpers used by the maintenance scripts: they decide which
 * database a script touches and must never print credentials.
 */
import { databaseName, describe as describeUri, isLiveDatabase, withDatabase } from "../scripts/lib/scriptDb";

const SRV = "mongodb+srv://shop:p%40ss@cluster0.abc.mongodb.net/bivanhandicraft?retryWrites=true&w=majority";
const PLAIN = "mongodb://localhost:27017/nevan";

describe("script connection helpers", () => {
  it("reads the database name", () => {
    expect(databaseName(SRV)).toBe("bivanhandicraft");
    expect(databaseName(PLAIN)).toBe("nevan");
    expect(databaseName("mongodb://localhost:27017")).toBe("test");
  });

  it("switches database but keeps the cluster, user and options", () => {
    expect(withDatabase(SRV, "nevan_clone")).toBe(
      "mongodb+srv://shop:p%40ss@cluster0.abc.mongodb.net/nevan_clone?retryWrites=true&w=majority",
    );
    expect(withDatabase("mongodb://localhost:27017", "x")).toBe("mongodb://localhost:27017/x");
  });

  it("describes a target without the user or password", () => {
    expect(describeUri(SRV)).toBe("cluster0.abc.mongodb.net/bivanhandicraft");
    expect(describeUri(SRV)).not.toMatch(/shop|p%40ss/);
  });

  it("recognises the live database", () => {
    expect(isLiveDatabase(SRV)).toBe(true);
    expect(isLiveDatabase(withDatabase(SRV, "nevan_clone"))).toBe(false);
    expect(isLiveDatabase(PLAIN)).toBe(false);
  });
});
