import * as R from "ramda";
import { shuffle } from "./utils";

export const colors = ["blue", "brown", "gray", "green", "red", "yellow"];

export const hexColors = {
  blue: "#0075c9",
  brown: "#826940",
  gray: "#1d1d1d",
  green: "#05ce7c",
  red: "#e94f3d",
  yellow: "#ffc843",
};

export const avatars = {
  blue: [
    "blue_beetle",
    "blue_hippopotamus",
    "blue_manatee",
    "blue_toucan",
    "blue_butterfly",
    "blue_pelican",
    "blue_snail",
    "blue_whale",
  ],
  brown: [
    "brown_bulldog",
    "brown_cat",
    "brown_kangaroo",
    "brown_sloth",
    "brown_camel",
    "brown_hedgehog",
    "brown_monkey",
    "brown_squirrel",
  ],
  gray: [
    "gray_bat",
    "gray_mouse",
    "gray_racoon",
    "gray_rhino",
    "gray_elephant",
    "gray_panda",
    "gray_ray",
    "gray_shark",
  ],
  green: [
    "green_chameleon",
    "green_dragonfly",
    "green_grasshopper",
    "green_snake",
    "green_crocodile",
    "green_frog",
    "green_hummingbird",
    "green_turtle",
  ],
  red: [
    "red_bird",
    "red_flamingo",
    "red_macaw",
    "red_pig",
    "red_crab",
    "red_ladybug",
    "red_octopus",
    "red_rooster",
  ],
  yellow: [
    "yellow_bee",
    "yellow_duck",
    "yellow_giraffe",
    "yellow_llama",
    "yellow_clown-fish",
    "yellow_fox",
    "yellow_lion",
    "yellow_tiger",
  ],
};

const flipObject = R.pipe(
  R.toPairs,
  R.reduce((acc, [key, values]) =>
    R.mergeRight(
      acc,
      R.fromPairs(R.map(value => [value, key], values))
    ), {})
);

export const colorMap = flipObject(avatars);

export const pickPlayer = R.pipe(
  R.difference(colors),
  shuffle,
  R.head,
  R.converge(R.pipe(R.pair, R.zipObj(["color", "avatar"])), [
    R.identity,
    R.pipe(R.prop(R.__, avatars), shuffle, R.head),
  ])
);
