import { test, expect } from "@jest/globals";
import { autocomplete } from "./google";

test("autocomplete", async () => {
  const result = await autocomplete("what in the");
  expect(result).toBeInstanceOf(Array);
  for (const s of result)
    expect(s).toEqual(expect.stringContaining("what in the"));
});
