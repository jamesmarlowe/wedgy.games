import { test, expect } from "@jest/globals";
import { shuffle, readCookies } from "./utils";

test("shuffle", () => {
  const result = shuffle([1, 2, 3]);
  expect(result).toBeInstanceOf(Array);
  expect(result).toContain(1);
  expect(result).toContain(2);
  expect(result).toContain(3);
});

test("readCookies", () => {
  const result = readCookies("hello=world;foo=bar");
  expect(result).toBeInstanceOf(Object);
  expect(result).toStrictEqual({ foo: "bar", hello: "world" });
});
