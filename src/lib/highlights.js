let color;

export const closer = (n, m) => {
  return m === n ? n : m > n ? n + 1 : n - 1;
};

export const closerArray = (n, m) => {
  return [closer(n[0], m[0]), closer(n[1], m[1])];
};

export const shortestPath = (s, e) => {
  const path = [s.split("-").map((index) => Number.parseInt(index, 10))];
  const end = e.split("-").map((index) => Number.parseInt(index, 10));
  let current = path[path.length - 1];
  while (current.join("-") !== end.join("-")) {
    path.push(closerArray(current, end));
    current = path[path.length - 1];
  }
  return path;
};

const checkWord = (word, words, id, start, closest, findWord) => {
  const forword = word.join("");
  const backword = word.reverse().join("");
  if (words.includes(forword)) {
    // document.querySelector(`#${id}`).setAttribute("id", `h-${forword}`);
    findWord(forword, start, closest.id);
    if (window.navigator.vibrate) window.navigator.vibrate(200);
    return false;
  }
  if (words.includes(backword)) {
    // document.querySelector(`#${id}`).setAttribute("id", `h-${backword}`);
    findWord(backword, closest.id, start);
    if (window.navigator.vibrate) window.navigator.vibrate(200);
    return false;
  }
  return true;
};

const getAngle = (y1, x1, y2, x2) => {
  if (x2 < x1) {
    [x1, x2, y1, y2] = [x2, x1, y2, y1];
  }
  const cathetus1 = x2 - x1;
  const cathetus2 = y2 - y1;
  const hypotenuse = Math.sqrt(cathetus1 * cathetus1 + cathetus2 * cathetus2);
  // const w = hypotenuse + weight;
  const angRadians = Math.asin(cathetus2 / hypotenuse);
  return [angRadians * (180 / Math.PI) - 90, hypotenuse];
};

const invalidAngle = (ang) => {
  const r = 1;
  return ![0, -90, -180, -135, -45].some((n) => n - r < ang && n + r > ang);
};

export const dotDraw = (y1, x1, y2, x2, hcolor = color, id) => {
  if (x2 < x1) {
    [x1, x2, y1, y2] = [x2, x1, y2, y1];
  }
  const [ang, hypotenuse] = getAngle(y1, x1, y2, x2);
  // console.log(ang);

  if (invalidAngle(ang)) {
    return false;
  }
  // console.log("drawing line");
  if (id) {
    document.querySelector(
      `#${id}`
    ).style = `transform:rotate(${ang}deg);height:${hypotenuse}px;top:${y1}px;left:${
      x1 - 3
    }px;`;
  } else {
    document.querySelector(
      "#highlights"
    ).innerHTML += `<div class="highlight ${hcolor}" style='transform:rotate(${ang}deg);height:${hypotenuse}px;top:${y1}px;left:${
      x1 - 3
    }px;'></div>`;
  }
  return true;
};

const closestValid = (original, current) => {
  const [x1, y1] = original
    .split("-")
    .map((index) => Number.parseInt(index, 10));
  const [x2, y2] = current
    .split("-")
    .map((index) => Number.parseInt(index, 10));
  const [ang] = getAngle(y1, x1, y2, x2);
  const angles = [0, -45, -90, -135, -180];
  const closest = angles.reduce((previous, current_) => {
    return Math.abs(current_ - ang) < Math.abs(previous - ang)
      ? current_
      : previous;
  });
  // console.log(closest);
  if ([0, -180].includes(closest)) {
    // console.log(x1, y1, x1, y2);
    return document.querySelector(`.grid-${x1}-${y2}`);
  }
  if (closest === -90) {
    // console.log(x1, y1, x2, y1);
    return document.querySelector(`.grid-${x2}-${y1}`);
  }
  if (closest === -45) {
    return document.querySelector(`.grid-${x2}-${x2 - x1 + y1}`);
  }
  if (closest === -135) {
    return document.querySelector(`.grid-${x2}-${x1 - x2 + y1}`);
  }
};

export const setupHighlights = (yourColor, words, puzzle, findWord) => {
  // console.log("setup drawing lines");
  color = yourColor;
  document.querySelector("#highlights").innerHTML = "";
  const page = document.querySelector("#container");
  const base = document.querySelector("#wordsearch-grid"); // the container for the variable content
  const selector = ".column"; // any css selector for children
  let x1;
  let x2;
  let y1;
  let y2;
  let down = false;
  let start;
  let path;
  const id = "asdf";
  // console.log(base);
  base.addEventListener("pointerdown", (event) => {
    down = true;
    // console.log("pointerdown");
    const closest = event.target.closest(selector);
    // console.log(event);
    // console.log(closest.id, base.contains(closest));
    if (closest && base.contains(closest)) {
      const { top, height, left, width } = closest.getBoundingClientRect();
      x1 = width / 2 + left;
      y1 = height / 2 + top;
      // console.log(closest.id);
      start = closest.id;
      document.querySelector(
        "#highlights"
      ).innerHTML += `<div id="${id}" class="highlight ${color}" style='top:${y1}px;left:${
        x1 - 3
      }px;'></div>`;
      // console.log(puzzle[closest.id.split("-")[0]][closest.id.split("-")[1]]);
    }
  });
  base.addEventListener("pointermove", (event) => {
    if (down) {
      const current = document
        .elementFromPoint(event.clientX, event.clientY)
        .closest(selector);
      const closest = closestValid(start, current.id);
      if (closest && base.contains(closest)) {
        const { top, height, left, width } = closest.getBoundingClientRect();
        x2 = width / 2 + left;
        y2 = height / 2 + top;
        const word = shortestPath(start, closest.id).map(
          (c) => puzzle[c[0]][c[1]]
        );
        if (dotDraw(y1, x1, y2, x2, color, id)) {
          down = checkWord(word, words, id, start, closest, findWord);
        }
      }
    }
  });
  const cancelHighlight = () => {
    down = false;
    if (document.querySelector(`#${id}`)) {
      document.querySelector(`#${id}`).remove();
    }
  };
  page.addEventListener("click", cancelHighlight);
  page.addEventListener("pointerup", cancelHighlight);
  page.addEventListener("contextmenu", cancelHighlight);
};

export const highlight = (start, end, word, hcolor) => {
  let { top, height, left, width } = document
    .getElementById(start)
    .getBoundingClientRect();
  const x1 = width / 2 + left;
  const y1 = height / 2 + top;
  ({ top, height, left, width } = document
    .getElementById(end)
    .getBoundingClientRect());
  const x2 = width / 2 + left;
  const y2 = height / 2 + top;
  dotDraw(y1, x1, y2, x2, hcolor);
};
