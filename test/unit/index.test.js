const { assert } = require('chai');
const chai = require('chai');
const fakeProfile = require('../fixtures/profile');
const sinon = require('sinon');
const TwitchTokenStrategy = require('../../');

const STRATEGY_CONFIG = { clientID: '123', clientSecret: '123' };
const BLANK_FUNCTION = () => {};

describe('TwitchTokenStrategy:init', () => {
  it('Should properly export Strategy constructor', () => {
    assert.isFunction(TwitchTokenStrategy);
  });

  it('Should properly initialize', () => {
    const strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, BLANK_FUNCTION);

    assert.equal(strategy.name, 'twitch-token');
    assert(strategy._oauth2._useAuthorizationHeaderForGET);
  });

  it('Should properly throw error on empty options', () => {
    assert.throws(() => new TwitchTokenStrategy(), Error);
  });
});

describe('TwitchTokenStrategy:authenticate', () => {
  describe('Authenticate without passReqToCallback', () => {
    let strategy;

    before(() => {
      strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, (accessToken, refreshToken, profile, next) => {
        assert.equal(accessToken, 'access_token');
        assert.equal(refreshToken, 'refresh_token');
        assert.typeOf(profile, 'object');
        assert.typeOf(next, 'function');
        return next(null, profile, { info: 'foo' });
      });

      sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, next) => next(null, fakeProfile, null));
    });

    it('Should properly parse token from body', done => {
      chai.passport.use(strategy)
        .success((user, info) => {
          assert.typeOf(user, 'object');
          assert.typeOf(info, 'object');
          assert.deepEqual(info, { info: 'foo' });
          done();
        })
        .req(req => {
          req.body = {
            access_token: 'access_token',
            refresh_token: 'refresh_token'
          };
        })
        .authenticate();
    });

    it('Should properly parse token from query', done => {
      chai.passport.use(strategy)
        .success((user, info) => {
          assert.typeOf(user, 'object');
          assert.typeOf(info, 'object');
          assert.deepEqual(info, { info: 'foo' });
          done();
        })
        .req(req => {
          req.query = {
            access_token: 'access_token',
            refresh_token: 'refresh_token'
          };
        })
        .authenticate();
    });

    it('Should properly call fail if access_token is not provided', done => {
      chai.passport.use(strategy)
        .fail(error => {
          assert.typeOf(error, 'object');
          assert.typeOf(error.message, 'string');
          assert.equal(error.message, 'You should provide access_token');
          done();
        })
        .authenticate();
    });
  });

  describe('Authenticate with passReqToCallback', () => {
    let strategy;

    before(() => {
      strategy = new TwitchTokenStrategy(Object.assign(STRATEGY_CONFIG, { passReqToCallback: true }), (req, accessToken, refreshToken, profile, next) => {
        assert.typeOf(req, 'object');
        assert.equal(accessToken, 'access_token');
        assert.equal(refreshToken, 'refresh_token');
        assert.typeOf(profile, 'object');
        assert.typeOf(next, 'function');
        return next(null, profile, { info: 'foo' });
      });

      sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, next) => next(null, fakeProfile, null));
    });

    it('Should properly call _verify with req', done => {
      chai.passport.use(strategy)
        .success((user, info) => {
          assert.typeOf(user, 'object');
          assert.typeOf(info, 'object');
          assert.deepEqual(info, { info: 'foo' });
          done();
        })
        .req(req => {
          req.body = {
            access_token: 'access_token',
            refresh_token: 'refresh_token'
          };
        })
        .authenticate({});
    });
  });
});

describe('TwitchTokenStrategy:userProfile', () => {
  it('Should properly fetch profile', done => {
    const strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, BLANK_FUNCTION);

    sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, next) => next(null, fakeProfile, null));

    strategy.userProfile('accessToken', (error, profile) => {
      if (error) return done(error);

      assert.equal(profile.provider, 'twitch');
      assert.equal(profile.id, '12345678');
      assert.equal(profile.displayName, 'Obrezkov Eugene');
      assert.equal(profile.name.familyName, 'Obrezkov');
      assert.equal(profile.name.givenName, 'Eugene');
      assert.deepEqual(profile.emails, [{ value: 'ghaiklor@gmail.com' }]);
      assert.equal(typeof profile._raw, 'string');
      assert.equal(typeof profile._json, 'object');

      done();
    });
  });

  it('Should properly handle exception on fetching profile', done => {
    const strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, BLANK_FUNCTION);

    sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, done) => done(null, 'not a JSON', null));

    strategy.userProfile('accessToken', (error, profile) => {
      assert(error instanceof SyntaxError);
      assert.equal(typeof profile, 'undefined');
      done();
    });
  });

  it('Should properly handle wrong JSON on fetching profile', done => {
    const strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, BLANK_FUNCTION);

    sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, done) => done(new Error('ERROR'), 'not a JSON', null));

    strategy.userProfile('accessToken', (error, profile) => {
      assert.instanceOf(error, Error);
      assert.equal(typeof profile, 'undefined');
      done();
    });
  });

  it('Should properly handle wrong JSON on fetching profile', done => {
    const strategy = new TwitchTokenStrategy(STRATEGY_CONFIG, BLANK_FUNCTION);

    sinon.stub(strategy._oauth2, 'get').callsFake((_url, _accessToken, done) => done({
      data: JSON.stringify({
        message: 'MESSAGE',
        status: 'CODE'
      })
    }, 'not a JSON', null));

    strategy.userProfile('accessToken', (error, profile) => {
      assert.equal(error.message, 'Failed to fetch user profile');
      assert.equal(typeof profile, 'undefined');
      done();
    });
  });
});
