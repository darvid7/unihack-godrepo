"use-strict";
/**
* auth.js
* Wrapper for crypto operations in application
* Author: Tyler Goodwin
*/
const crypto = require('crypto');
const basicAuth = require('basic-auth');

const SECRET = process.env.UNIHACK_SECRET || "super-secret-salt";
const ALGO = 'sha256';

class Auth {
  constructor(db, config){
    this.db = db;
    this.config = config;
    this.ADMIN_NAME = config.mqtt.username;
    this.ADMIN_PASSWORD = config.mqtt.password;
  }
  /**
  * Basic Auth middleware function for express server
  */
  basic(req, res, next){
    let unauthorized = res => {
      res.set('WWW-Authenticate', 'Basic realm=Authorization');
      return res.sendStatus(401);
    };

    let user = basicAuth(req);
    if(!user || !user.name || !user.pass){
      return unauthorized(res);
    }

    if(user.name != this.ADMIN_NAME && req.params.deviceId && req.params.deviceId != user.name){
      return unauthorized(res);
    }

    this.authenticate(user.name, user.pass, authenticated => {
      if(authenticated){
        next();
      }
      else {
        unauthorized(res);
      }
    });
  }

  /**
  *  Verifies if username and password match
  *  @param username - username for password lookup
  *  @param password - password to be compared with expected value
  *  @param callback - callback to be passed result. Result is true for authenticated, false otherwise.
  */
  authenticate(username, password, callback){
    if(username === this.ADMIN_NAME){
      return callback(password === this.ADMIN_PASSWORD);
    }
    this.db.getApiKeyDigest(username, digest => {
      callback(Auth.verifyEqual(password, digest));
    });
  }

  /**
  *  Digests the given input.
  *  _nom nom nom nom_
  *  @param input - input to be digested
  *  @returns digest string in hex format
  */
  static digest(input){
    let hmac = crypto.createHmac(ALGO, SECRET);
    hmac.update(input);
    return hmac.digest('hex');
  }

  /**
  *  Checks if the given digest was created from the given input
  *  @param input - Undigested input
  *  @param digest - digest to be compared to input
  *  @returns true if digested input is equal to digest, false otherwise
  */
  static verifyEqual(input, digest){
    return input && digest && this.digest(input) === digest;
  }

  static decodeBasic(request){
    return basicAuth(request);
  }
}

module.exports = Auth;
