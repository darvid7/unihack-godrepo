"use-strict";

const WRITE_MAX_TIME = 1000;
const READ_MAX_TIME = 1000;

class BLEService {
  constructor() {
    this.ready = false;
  }

  init(service, cachedChars, callback, characteristics) {
    this.service = service;

    if (cachedChars) {
      this.cachedChar = cachedChars;
      this.ready = true;
      callback();
    } else {
      this.cachedChar = {};

      var toFind = characteristics ? characteristics : []
      this.service.discoverCharacteristics(toFind, (e, chars) => {
        chars.forEach((c) => {
          this.cachedChar[c.uuid] = c;
        });
        this.ready = true;

        callback();
      });
    }
  }

  unsubscribeChar(uuid, callback) {
    if (!this.cachedChar[uuid]) {
      console.error("No such characteristic " + uuid);
      return false;
    } else {
      return new Promise((resolve => {
        this.cachedChar[uuid].unsubscribe((e) => {
          if (e) {
            console.error(e);
            resolve(false);
          } else {
            resolve(true);
          }
        })
      }).bind(this));
    }
  }

  subscribeChar(uuid, callback) {
    if (!this.cachedChar[uuid]) {
      console.error("No such characteristic " + uuid);
      return false;
    } else {
      return new Promise((resolve => {
        this.cachedChar[uuid].subscribe((e) => {
          if (e) {
            console.error(e);
            resolve(false);
          } else {
            this.cachedChar[uuid].on('data', callback);
            resolve(true);
          }
        })
      }).bind(this));
    }
  }

  readChar(uuid) {
    if (!this.cachedChar[uuid]) {
      console.error("No such characteristic " + uuid);
      return null;
    } else {
      return new Promise((resolve, reject) => {
        var timeout = setTimeout(() => {
          reject("Failed to read " + uuid);
        }, READ_MAX_TIME);

        this.cachedChar[uuid].read((e, data) => {
          clearTimeout(timeout);
          if (e) {
            console.log(e);
            resolve(null);
          } else {
            resolve(data);
          }
        })
      });
    }
  }

  writeChar(uuid, buffer) {
    if (!this.cachedChar[uuid]) {
      console.error("No such characteristic " + uuid);
      return false;

    } else {
      return new Promise((resolve, reject) => {
        var timeout = setTimeout(() => {
          reject("Failed to write " + uuid + " Buffer " + buffer)
        }, WRITE_MAX_TIME);

        this.cachedChar[uuid].write(buffer, true, (e) => {
          clearTimeout(timeout);
          if (e) {
            console.log(e);
            resolve(false);
          } else {
            resolve(true);
          }
        })
      });
    }
  }
}

module.exports = BLEService
