import https from "https";

export const junk = () => "junk";

export const autocomplete = (query = "what am I") =>
  new Promise((resolve, reject) =>
    https.get(
      `https://www.google.com/complete/search?q=${query}&client=opera`,
      (resp) => {
        let data = "";

        // A chunk of data has been recieved.
        resp.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on("end", () => {
          // console.log(JSON.parse(data)[1]);
          resolve(JSON.parse(data)[1]);
        });

        resp.on("error", (error) => {
          reject(error);
        });
      }
    )
  );
