const { OAuth2Strategy, InternalOAuthError } = require('passport-oauth');

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
 * @param {Object} _options
 * @param {Function} _verify
 * @example
 * passport.use(new TwitchTokenStrategy({
 *   clientID: '123456789',
 *   clientSecret: 'shh-its-a-secret'
 * }), function(req, accessToken, refreshToken, profile, next) {
 *   User.findOrCreate({twitchId: profile.id}, function(error, user) {
 *     next(error, user);
 *   })
 * })
 */
module.exports = class TwitchTokenStrategy extends OAuth2Strategy {
  constructor (_options, _verify) {
    const options = _options || {};
    const verify = _verify;

    options.authorizationURL = options.authorizationURL || 'https://api.twitch.tv/kraken/oauth2/authorize';
    options.tokenURL = options.tokenURL || 'https://api.twitch.tv/kraken/oauth2/token';

    super(options, verify);

    this.name = 'twitch-token';
    this._accessTokenField = options.accessTokenField || 'access_token';
    this._refreshTokenField = options.refreshTokenField || 'refresh_token';
    this._profileURL = options.profileURL || 'https://api.twitch.tv/kraken/user';
    this._passReqToCallback = options.passReqToCallback;

    this._oauth2.setAuthMethod('Bearer');
    this._oauth2.useAuthorizationHeaderforGET(true);
    this._oauth2._customHeaders = { 'Client-ID': this._oauth2._clientId };
  }

  authenticate (req, _options) {
    const accessToken = (req.body && req.body[this._accessTokenField]) || (req.query && req.query[this._accessTokenField]);
    const refreshToken = (req.body && req.body[this._refreshTokenField]) || (req.query && req.query[this._refreshTokenField]);

    if (!accessToken) return this.fail({ message: `You should provide ${this._accessTokenField}` });

    this._loadUserProfile(accessToken, (error, profile) => {
      if (error) return this.error(error);

      const verified = (error, user, info) => {
        if (error) return this.error(error);
        if (!user) return this.fail(info);

        return this.success(user, info);
      };

      if (this._passReqToCallback) {
        this._verify(req, accessToken, refreshToken, profile, verified);
      } else {
        this._verify(accessToken, refreshToken, profile, verified);
      }
    });
  }

  userProfile (accessToken, done) {
    this._oauth2.get(this._profileURL, accessToken, (error, body, _res) => {
      if (error) {
        try {
          const errorJSON = JSON.parse(error.data);
          return done(new InternalOAuthError(errorJSON.message, errorJSON.status));
        } catch (_) {
          return done(new InternalOAuthError('Failed to fetch user profile', error));
        }
      }

      try {
        const json = JSON.parse(body);
        json.id = json._id;

        const profile = {
          provider: 'twitch',
          id: json.id,
          username: json.name || '',
          displayName: json.display_name || '',
          name: {
            familyName: json.display_name ? json.display_name.split(' ', 2)[0] : '',
            givenName: json.display_name ? json.display_name.split(' ', 2)[1] : ''
          },
          emails: [{ value: json.email }],
          photos: [],
          _raw: body,
          _json: json
        };

        return done(null, profile);
      } catch (e) {
        return done(e);
      }
    });
  }
};
