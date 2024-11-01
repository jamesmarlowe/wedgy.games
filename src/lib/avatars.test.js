import { test, expect } from "@jest/globals";
import { colors, avatars, pickPlayer } from "./avatars";

test("colors list", () => {
  expect(colors).toBeInstanceOf(Array);
});

test("avatars list", () => {
  expect(avatars).toBeInstanceOf(Object);
});

test("pickPlayer", () => {
  const result = pickPlayer([]);
  expect(result).toBeInstanceOf(Object);
});
