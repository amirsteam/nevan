import { describe, it, expect } from "vitest";
import { suggestEmail } from "./emailTypo";

describe("suggestEmail", () => {
  it.each([
    ["anjana@gmial.com", "anjana@gmail.com"],
    ["anjana@gamil.com", "anjana@gmail.com"],
    ["anjana@gmail.con", "anjana@gmail.com"],
    ["Anjana@GMAIL.CO", "anjana@gmail.com"],
    ["ram@yaho.com", "ram@yahoo.com"],
    ["ram@hotmial.com", "ram@hotmail.com"],
    ["ram@outlok.com", "ram@outlook.com"],
    ["sita@school.con", "sita@school.com"],
  ])("suggests a fix for %s", (typed, expected) => {
    expect(suggestEmail(typed)).toBe(expected);
  });

  it.each([
    "anjana@gmail.com",
    "info@nevanhandicraft.com.np",
    "amir@svi.edu.np",
    "someone@protonmail.ch",
    "not-an-email",
    "missing@",
    "@gmail.com",
  ])("leaves %s alone", (typed) => {
    expect(suggestEmail(typed)).toBeNull();
  });
});
