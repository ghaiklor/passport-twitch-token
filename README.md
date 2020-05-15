# passport-twitch-token

![Build Status](https://img.shields.io/travis/ghaiklor/passport-twitch-token.svg)
![Coverage](https://img.shields.io/coveralls/ghaiklor/passport-twitch-token.svg)

![Downloads](https://img.shields.io/npm/dm/passport-twitch-token.svg)
![Downloads](https://img.shields.io/npm/dt/passport-twitch-token.svg)
![npm version](https://img.shields.io/npm/v/passport-twitch-token.svg)
![License](https://img.shields.io/npm/l/passport-twitch-token.svg)

[Passport](http://passportjs.org/) strategy for authenticating with Twitch access tokens using the OAuth 2.0 API.

This module lets you authenticate using Twitch in your Node.js applications.
By plugging into Passport, Twitch authentication can be easily and unobtrusively integrated into any application or framework that supports [Connect](http://www.senchalabs.org/connect/)-style middleware, including [Express](http://expressjs.com/).

## Installation

```shell
npm install passport-twitch-token
```

## Usage

### Configure Strategy

The Twitch authentication strategy authenticates users using a Twitch account and OAuth 2.0 tokens.
The strategy requires a `verify` callback, which accepts these credentials and calls `next` providing a user, as well as `options` specifying a app ID and app secret.

```javascript
var TwitchTokenStrategy = require('passport-twitch-token');

passport.use(new TwitchTokenStrategy({
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
    passReqToCallback: true
}, function(req, accessToken, refreshToken, profile, next) {
    User.findOrCreate({'twitch.id': profile.id}, function(error, user) {
        return next(error, user);
    });
}));
```

### Authenticate Requests

Use `passport.authenticate()`, specifying the `twitch-token` strategy, to authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/) application:

```javascript
app.get('/auth/twitch', passport.authenticate('twitch-token'));
```

Or if you are using Sails framework:

```javascript
// AuthController.js
module.exports = {
    twitch: function(req, res) {
        passport.authenticate('twitch-token', function(error, user, info) {
            if (error) return res.serverError(error);
            if (info) return res.unauthorized(info);
            return res.ok(user);
        })(req, res);
    }
};
```

The request to this route should include a GET or POST data with the keys `access_token` and optionally, `refresh_token` set to the credentials you receive from Twitch.

```bash
GET /auth/twitch?access_token=<TOKEN>
```

## Issues

If you receive a `401 Unauthorized` error, it is most likely because you have wrong access token or not yet specified any application permissions.
Once you refresh access token with new permissions, try to send this access token again.

## License

[The MIT License (MIT)](./LICENSE)
