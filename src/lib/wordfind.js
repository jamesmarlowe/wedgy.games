/**
 * Wordfind.js 0.0.1
 * (c) 2012 Bill, BunKat LLC.
 * Wordfind is freely distributable under the MIT license.
 * For all details and documentation:
 *     http://github.com/bunkat/wordfind
 */

(function () {
  /**
   * Generates a new word find (word search) puzzle provided a set of words.
   * Can automatically determine the smallest puzzle size in which all words
   * fit, or the puzzle size can be manually configured.  Will automatically
   * increase puzzle size until a valid puzzle is found.
   *
   * WordFind has no dependencies.
   */

  /**
   * Initializes the WordFind object.
   *
   * @api private
   */
  const WordFind = function () {
    // Letters used to fill blank spots in the puzzle
    let LETTERS = "ABCDEFGHIJKLMNOPRSTUVWY";

    /**
     * Definitions for all the different orientations in which words can be
     * placed within a puzzle. New orientation definitions can be added and they
     * will be automatically available.
     */

    // The list of all the possible orientations
    const allOrientations = [
      "horizontal",
      "horizontalBack",
      "vertical",
      "verticalUp",
      "diagonal",
      "diagonalUp",
      "diagonalBack",
      "diagonalUpBack"
    ];

    // The definition of the orientation, calculates the next square given a
    // starting square (x,y) and distance (i) from that square.
    const orientations = {
      horizontal(x, y, index) {
        return { x: x + index, y };
      },
      horizontalBack(x, y, index) {
        return { x: x - index, y };
      },
      vertical(x, y, index) {
        return { x, y: y + index };
      },
      verticalUp(x, y, index) {
        return { x, y: y - index };
      },
      diagonal(x, y, index) {
        return { x: x + index, y: y + index };
      },
      diagonalBack(x, y, index) {
        return { x: x - index, y: y + index };
      },
      diagonalUp(x, y, index) {
        return { x: x + index, y: y - index };
      },
      diagonalUpBack(x, y, index) {
        return { x: x - index, y: y - index };
      }
    };

    // Determines if an orientation is possible given the starting square (x,y),
    // the height (h) and width (w) of the puzzle, and the length of the word (l).
    // Returns true if the word will fit starting at the square provided using
    // the specified orientation.
    const checkOrientations = {
      horizontal(x, y, h, w, l) {
        return w >= x + l;
      },
      horizontalBack(x, y, h, w, l) {
        return x + 1 >= l;
      },
      vertical(x, y, h, w, l) {
        return h >= y + l;
      },
      verticalUp(x, y, h, w, l) {
        return y + 1 >= l;
      },
      diagonal(x, y, h, w, l) {
        return w >= x + l && h >= y + l;
      },
      diagonalBack(x, y, h, w, l) {
        return x + 1 >= l && h >= y + l;
      },
      diagonalUp(x, y, h, w, l) {
        return w >= x + l && y + 1 >= l;
      },
      diagonalUpBack(x, y, h, w, l) {
        return x + 1 >= l && y + 1 >= l;
      }
    };

    // Determines the next possible valid square given the square (x,y) was ]
    // invalid and a word lenght of (l).  This greatly reduces the number of
    // squares that must be checked. Returning {x: x+1, y: y} will always work
    // but will not be optimal.
    const skipOrientations = {
      horizontal(x, y, l) {
        return { x: 0, y: y + 1 };
      },
      horizontalBack(x, y, l) {
        return { x: l - 1, y };
      },
      vertical(x, y, l) {
        return { x: 0, y: y + 100 };
      },
      verticalUp(x, y, l) {
        return { x: 0, y: l - 1 };
      },
      diagonal(x, y, l) {
        return { x: 0, y: y + 1 };
      },
      diagonalBack(x, y, l) {
        return { x: l - 1, y: x >= l - 1 ? y + 1 : y };
      },
      diagonalUp(x, y, l) {
        return { x: 0, y: y < l - 1 ? l - 1 : y + 1 };
      },
      diagonalUpBack(x, y, l) {
        return { x: l - 1, y: x >= l - 1 ? y + 1 : y };
      }
    };

    /**
     * Initializes the puzzle and places words in the puzzle one at a time.
     *
     * Returns either a valid puzzle with all of the words or null if a valid
     * puzzle was not found.
     *
     * @param {[String]} words: The list of words to fit into the puzzle
     * @param {[Options]} options: The options to use when filling the puzzle
     */
    const fillPuzzle = function (words, options) {
      LETTERS = [...new Set(words.join(""))].join("");
      const puzzle = [];
      let index;
      let j;
      let length_;

      // initialize the puzzle with blanks
      for (index = 0; index < options.height; index++) {
        puzzle.push([]);
        for (j = 0; j < options.width; j++) {
          puzzle[index].push("");
        }
      }

      // add each word into the puzzle one at a time
      for (index = 0, length_ = words.length; index < length_; index++) {
        if (!placeWordInPuzzle(puzzle, options, words[index])) {
          // if a word didn't fit in the puzzle, give up
          return null;
        }
      }

      // return the puzzle
      return puzzle;
    };

    /**
     * Adds the specified word to the puzzle by finding all of the possible
     * locations where the word will fit and then randomly selecting one. Options
     * controls whether or not word overlap should be maximized.
     *
     * Returns true if the word was successfully placed, false otherwise.
     *
     * @param {[[String]]} puzzle: The current state of the puzzle
     * @param {[Options]} options: The options to use when filling the puzzle
     * @param {String} word: The word to fit into the puzzle.
     */
    var placeWordInPuzzle = function (puzzle, options, word) {
      // find all of the best locations where this word would fit
      const locations = findBestLocations(puzzle, options, word);

      if (locations.length === 0) {
        return false;
      }

      // select a location at random and place the word there
      const sel = locations[Math.floor(Math.random() * locations.length)];
      placeWord(puzzle, word, sel.x, sel.y, orientations[sel.orientation]);

      return true;
    };

    /**
     * Iterates through the puzzle and determines all of the locations where
     * the word will fit. Options determines if overlap should be maximized or
     * not.
     *
     * Returns a list of location objects which contain an x,y cooridinate
     * indicating the start of the word, the orientation of the word, and the
     * number of letters that overlapped with existing letter.
     *
     * @param {[[String]]} puzzle: The current state of the puzzle
     * @param {[Options]} options: The options to use when filling the puzzle
     * @param {String} word: The word to fit into the puzzle.
     */
    var findBestLocations = function (puzzle, options, word) {
      const locations = [];
      const { height } = options;
      const { width } = options;
      const wordLength = word.length;
      let maxOverlap = 0; // we'll start looking at overlap = 0

      // loop through all of the possible orientations at this position
      for (let k = 0, length_ = options.orientations.length; k < length_; k++) {
        const orientation = options.orientations[k];
        const check = checkOrientations[orientation];
        const next = orientations[orientation];
        const skipTo = skipOrientations[orientation];
        let x = 0;
        let y = 0;

        // loop through every position on the board
        while (y < height) {
          // see if this orientation is even possible at this location
          if (check(x, y, height, width, wordLength)) {
            // determine if the word fits at the current position
            const overlap = calcOverlap(word, puzzle, x, y, next);

            // if the overlap was bigger than previous overlaps that we've seen
            if (
              overlap >= maxOverlap ||
              (!options.preferOverlap && overlap > -1)
            ) {
              maxOverlap = overlap;
              locations.push({
                x,
                y,
                orientation,
                overlap
              });
            }

            x++;
            if (x >= width) {
              x = 0;
              y++;
            }
          } else {
            // if current cell is invalid, then skip to the next cell where
            // this orientation is possible. this greatly reduces the number
            // of checks that we have to do overall
            const nextPossible = skipTo(x, y, wordLength);
            x = nextPossible.x;
            y = nextPossible.y;
          }
        }
      }

      // finally prune down all of the possible locations we found by
      // only using the ones with the maximum overlap that we calculated
      // JAMES: changed maxOverlap to random to limit overlapping
      const r_ = Math.floor(Math.random() * maxOverlap);
      console.log("overlap:", r_, maxOverlap);
      return options.preferOverlap ? pruneLocations(locations, r_) : locations;
    };

    /**
     * Determines whether or not a particular word fits in a particular
     * orientation within the puzzle.
     *
     * Returns the number of letters overlapped with existing words if the word
     * fits in the specified position, -1 if the word does not fit.
     *
     * @param {String} word: The word to fit into the puzzle.
     * @param {[[String]]} puzzle: The current state of the puzzle
     * @param {int} x: The x position to check
     * @param {int} y: The y position to check
     * @param {function} fnGetSquare: Function that returns the next square
     */
    var calcOverlap = function (word, puzzle, x, y, functionGetSquare) {
      let overlap = 0;

      // traverse the squares to determine if the word fits
      for (let i = 0, length_ = word.length; i < length_; i++) {
        const next = functionGetSquare(x, y, i);
        const square = puzzle[next.y][next.x];

        // if the puzzle square already contains the letter we
        // are looking for, then count it as an overlap square
        if (square === word[i]) {
          overlap++;
        } else if (square !== "") {
          // if it contains a different letter, than our word doesn't fit
          // here, return -1
          return -1;
        }
      }

      // if the entire word is overlapping, skip it to ensure words aren't
      // hidden in other words
      return overlap;
    };

    /**
     * If overlap maximization was indicated, this function is used to prune the
     * list of valid locations down to the ones that contain the maximum overlap
     * that was previously calculated.
     *
     * Returns the pruned set of locations.
     *
     * @param {[Location]} locations: The set of locations to prune
     * @param {int} overlap: The required level of overlap
     */
    var pruneLocations = function (locations, overlap) {
      const pruned = [];
      for (
        let index = 0, length_ = locations.length;
        index < length_;
        index++
      ) {
        if (locations[index].overlap >= overlap) {
          pruned.push(locations[index]);
        }
      }
      return pruned;
    };

    /**
     * Places a word in the puzzle given a starting position and orientation.
     *
     * @param {[[String]]} puzzle: The current state of the puzzle
     * @param {String} word: The word to fit into the puzzle.
     * @param {int} x: The x position to check
     * @param {int} y: The y position to check
     * @param {function} fnGetSquare: Function that returns the next square
     */
    var placeWord = function (puzzle, word, x, y, functionGetSquare) {
      for (let i = 0, length_ = word.length; i < length_; i++) {
        const next = functionGetSquare(x, y, i);
        puzzle[next.y][next.x] = word[i];
      }
    };

    return {
      /**
       * Returns the list of all of the possible orientations.
       * @api public
       */
      validOrientations: allOrientations,

      /**
       * Returns the orientation functions for traversing words.
       * @api public
       */
      orientations,

      /**
       * Generates a new word find (word search) puzzle.
       *
       * Settings:
       *
       * height: desired height of the puzzle, default: smallest possible
       * width:  desired width of the puzzle, default: smallest possible
       * orientations: list of orientations to use, default: all orientations
       * fillBlanks: true to fill in the blanks, default: true
       * maxAttempts: number of tries before increasing puzzle size, default:3
       * maxGridGrowth: number of puzzle grid increases, default:10
       * preferOverlap: maximize word overlap or not, default: true
       *
       * Returns the puzzle that was created.
       *
       * @param {[String]} words: List of words to include in the puzzle
       * @param {options} settings: The options to use for this puzzle
       * @api public
       */
      newPuzzle(words, settings) {
        if (words.length === 0) {
          throw new Error("Zero words provided");
        }
        let wordList;
        let puzzle;
        let attempts = 0;
        let gridGrowths = 0;
        const options_ = settings || {};

        // copy and sort the words by length, inserting words into the puzzle
        // from longest to shortest works out the best
        wordList = words.slice(0).sort();

        // initialize the options
        const maxWordLength = wordList[0].length;
        const options = {
          height: options_.height || maxWordLength,
          width: options_.width || maxWordLength,
          orientations: options_.orientations || allOrientations,
          fillBlanks:
            options_.fillBlanks !== undefined ? options_.fillBlanks : true,
          allowExtraBlanks:
            options_.allowExtraBlanks !== undefined
              ? options_.allowExtraBlanks
              : true,
          maxAttempts: options_.maxAttempts || 3,
          maxGridGrowth:
            options_.maxGridGrowth !== undefined ? options_.maxGridGrowth : 10,
          preferOverlap:
            options_.preferOverlap !== undefined ? options_.preferOverlap : true
        };

        // add the words to the puzzle
        // since puzzles are random, attempt to create a valid one up to
        // maxAttempts and then increase the puzzle size and try again
        while (!puzzle) {
          while (!puzzle && attempts++ < options.maxAttempts) {
            puzzle = fillPuzzle(wordList, options);
          }

          if (!puzzle) {
            gridGrowths++;
            if (gridGrowths > options.maxGridGrowth) {
              throw new Error(
                `No valid ${options.width}x${options.height} grid found and not allowed to grow more`
              );
            }
            console.log(
              `No valid ${options.width}x${options.height} grid found after ${
                attempts - 1
              } attempts, trying with bigger grid`
            );
            options.height++;
            options.width++;
            attempts = 0;
          }
        }

        // fill in empty spaces with random letters
        if (options.fillBlanks) {
          let lettersToAdd;
          let fillingBlanksCount = 0;
          let extraLetterGenerator;
          if (typeof options.fillBlanks === "function") {
            extraLetterGenerator = options.fillBlanks;
          } else if (typeof options.fillBlanks === "string") {
            lettersToAdd = options.fillBlanks.toLowerCase().split("");
            extraLetterGenerator = () =>
              lettersToAdd.pop() || (fillingBlanksCount++ && "");
          } else {
            extraLetterGenerator = () =>
              LETTERS[Math.floor(Math.random() * LETTERS.length)];
          }
          const extraLettersCount = this.fillBlanks({
            puzzle,
            extraLetterGenerator
          });
          if (lettersToAdd && lettersToAdd.length > 0) {
            throw new Error(
              `Some extra letters provided were not used: ${lettersToAdd}`
            );
          }
          if (lettersToAdd && fillingBlanksCount && !options.allowExtraBlanks) {
            throw new Error(
              `${fillingBlanksCount} extra letters were missing to fill the grid`
            );
          }
          const gridFillPercent =
            100 * (1 - extraLettersCount / (options.width * options.height));
          console.log(
            `Blanks filled with ${extraLettersCount} random letters - Final grid is filled at ${gridFillPercent.toFixed(
              0
            )}%`
          );
        }

        return puzzle;
      },

      /**
       * Wrapper around `newPuzzle` allowing to find a solution without some words.
       *
       * @param {options} settings: The options to use for this puzzle.
       * Same as `newPuzzle` + allowedMissingWords
       */
      newPuzzleLax(words, options) {
        try {
          return this.newPuzzle(words, options);
        } catch (error) {
          if (!options.allowedMissingWords) {
            throw error;
          }
          var options = { ...options }; // shallow copy
          options.allowedMissingWords--;
          for (let index = 0; index < words.length; index++) {
            const wordList = words.slice(0);
            wordList.splice(index, 1);
            try {
              const puzzle = this.newPuzzleLax(wordList, options);
              console.log(`Solution found without word "${words[index]}"`);
              return puzzle;
            } catch {} // continue if error
          }
          throw error;
        }
      },

      /**
       * Fills in any empty spaces in the puzzle with random letters.
       *
       * @param {[[String]]} puzzle: The current state of the puzzle
       * @api public
       */
      fillBlanks({ puzzle, extraLetterGenerator }) {
        let extraLettersCount = 0;
        for (let index = 0, height = puzzle.length; index < height; index++) {
          const row = puzzle[index];
          for (let j = 0, width = row.length; j < width; j++) {
            if (!puzzle[index][j]) {
              puzzle[index][j] = extraLetterGenerator();
              extraLettersCount++;
            }
          }
        }
        return extraLettersCount;
      },

      /**
       * Returns the starting location and orientation of the specified words
       * within the puzzle. Any words that are not found are returned in the
       * notFound array.
       *
       * Returns
       *   x position of start of word
       *   y position of start of word
       *   orientation of word
       *   word
       *   overlap (always equal to word.length)
       *
       * @param {[[String]]} puzzle: The current state of the puzzle
       * @param {[String]} words: The list of words to find
       * @api public
       */
      solve(puzzle, words) {
        const options = {
          height: puzzle.length,
          width: puzzle[0].length,
          orientations: allOrientations,
          preferOverlap: true
        };
        const found = [];
        const notFound = [];

        for (let index = 0, length_ = words.length; index < length_; index++) {
          const word = words[index];
          const locations = findBestLocations(puzzle, options, word);

          if (locations.length > 0 && locations[0].overlap === word.length) {
            locations[0].word = word;
            found.push(locations[0]);
          } else {
            notFound.push(word);
          }
        }

        return { found, notFound };
      },

      /**
       * Outputs a puzzle to the console, useful for debugging.
       * Returns a formatted string representing the puzzle.
       *
       * @param {[[String]]} puzzle: The current state of the puzzle
       * @api public
       */
      print(puzzle) {
        let puzzleString = "";
        for (let index = 0, height = puzzle.length; index < height; index++) {
          const row = puzzle[index];
          for (let index = 0, width = row.length; index < width; index++) {
            puzzleString += `${row[index] === "" ? " " : row[index]} `;
          }
          puzzleString += "\n";
        }

        console.log(puzzleString);
        return puzzleString;
      }
    };
  };

  /**
   * Allow library to be used within both the browser and node.js
   */
  const root =
    typeof exports !== "undefined" && exports !== null ? exports : window;
  root.wordfind = WordFind();
}.call(this));
