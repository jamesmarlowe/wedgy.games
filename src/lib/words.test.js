import { test, expect } from "@jest/globals";
import { THEMED_WORDS } from "./words";

test("shuffle", () => {
  expect(THEMED_WORDS).toBeInstanceOf(Object);
  for (const a of Object.values(THEMED_WORDS)) expect(a).toBeInstanceOf(Array);
});
