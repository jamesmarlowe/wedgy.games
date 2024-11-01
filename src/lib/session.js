const redis = require("redis");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const { REDIS_URL } = require("./constants");

const client = redis.createClient(REDIS_URL);

const redisSession = session({
  store: new RedisStore({ client }),
  secret: "GEZL7tYgV496ozBz130TtUUPk",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: false },
  name: "sid",
});

export default (request, response, next) => {
  let tries = 3;

  const lookupSession = (error) => {
    if (error) {
      return next(error);
    }

    tries -= 1;

    if (request.session !== undefined) {
      return next();
    }

    if (tries < 0) {
      return next(new Error("oh no"));
    }

    return redisSession(request, response, lookupSession);
  };

  lookupSession();
};
