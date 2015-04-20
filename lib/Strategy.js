var util = require('util');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var InternalOAuthError = require('passport-oauth').InternalOAuthError;

util.inherits(TwitchTokenStrategy, OAuth2Strategy);

/**
 * `Strategy` constructor.
 * The Twitch authentication strategy authenticates requests by delegating to Twitch using OAuth2 access tokens.
 * Applications must supply a `verify` callback which accepts a accessToken, refreshToken, profile and callback.
 * Callback supplying a `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occurs, `error` should be set.
 *
 * Options:
 * - clientID          Identifies client to Twitch App
 * - clientSecret      Secret used to establish ownership of the consumer key
 * - passReqToCallback If need, pass req to verify callback
 *
 * Example:
 *     passport.use(new TwitchTokenStrategy({
 *           clientID: '123-456-789',
 *           clientSecret: 'shhh-its-a-secret',
 *           passReqToCallback: true
 *       }, function(req, accessToken, refreshToken, profile, next) {
 *              User.findOrCreate(..., function (error, user) {
 *                  next(error, user);
 *              });
 *          }
 *       ));
 *
 * @param {Object} _options
 * @param {Function} _verify
 * @constructor
 */
function TwitchTokenStrategy(_options, _verify) {
  var options = _options || {};
  options.authorizationURL = options.authorizationURL || 'https://api.twitch.tv/kraken/oauth2/authorize';
  options.tokenURL = options.tokenURL || 'https://api.twitch.tv/kraken/oauth2/token';
  options.profileURL = options.profileURL || 'https://api.twitch.tv/kraken/user';

  OAuth2Strategy.call(this, options, _verify);

  this.name = 'twitch-token';
  this._profileURL = options.profileURL;
  this._passReqToCallback = options.passReqToCallback;
  this._oauth2.setAuthMethod('OAuth');
  this._oauth2.useAuthorizationHeaderforGET(true);
}

/**
 * Authenticate method
 * @param {Object} req
 * @param {Object} options
 * @returns {*}
 */
TwitchTokenStrategy.prototype.authenticate = function (req, options) {
  var self = this;
  var accessToken = (req.body && req.body.access_token) || (req.query && req.query.access_token) || (req.headers && req.headers.access_token);
  var refreshToken = (req.body && req.body.refresh_token) || (req.query && req.query.refresh_token) || (req.headers && req.headers.refresh_token);

  if (!accessToken) {
    return self.fail({message: 'You should provide access_token'});
  }

  self._loadUserProfile(accessToken, function (error, profile) {
    if (error) return self.error(error);

    function verified(error, user, info) {
      if (error) return self.error(error);
      if (!user) return self.fail(info);

      return self.success(user, info);
    }

    if (self._passReqToCallback) {
      self._verify(req, accessToken, refreshToken, profile, verified);
    } else {
      self._verify(accessToken, refreshToken, profile, verified);
    }
  });
};

/**
 * Parse user profile
 * @param {String} accessToken Twitch OAuth2 access token
 * @param {Function} done
 */
TwitchTokenStrategy.prototype.userProfile = function (accessToken, done) {
  this._oauth2.get(this._profileURL, accessToken, function (error, body, res) {
    if (error) {
      try {
        var errorJSON = JSON.parse(error.data);
        return done(new InternalOAuthError(errorJSON.message, errorJSON.status));
      } catch (_) {
        return done(new InternalOAuthError('Failed to fetch user profile', error));
      }
    }

    try {
      var json = JSON.parse(body);
      json['id'] = json._id;

      var profile = {
        provider: 'twitch',
        id: json.id,
        username: json.name || '',
        displayName: json.display_name || '',
        name: {
          familyName: json.display_name ? json.display_name.split(' ', 2)[0] : '',
          givenName: json.display_name ? json.display_name.split(' ', 2)[1] : ''
        },
        emails: [{value: json.email}],
        photos: [],
        _raw: body,
        _json: json
      };

      return done(null, profile);
    } catch (e) {
      return done(e);
    }
  });
};

module.exports = TwitchTokenStrategy;
