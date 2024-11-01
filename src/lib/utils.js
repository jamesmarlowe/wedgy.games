import * as R from "ramda";

export function shuffle(a) {
  const b = a;
  for (let index = a.length - 1; index > 0; index--) {
    const index_ = Math.floor(Math.random() * (index + 1));
    [b[index], b[index_]] = [b[index_], b[index]];
  }
  return b;
}

export const mode = (array) =>
  array
    .sort(
      (a, b) =>
        array.filter((v) => v === a).length -
        array.filter((v) => v === b).length
    )
    .pop();

export const readCookies = R.pipe(
  R.split(";"),
  R.map(R.split("=")),
  R.fromPairs
);

// module.exports = { shuffle };
