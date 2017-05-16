"use strict";

/**
 * Class that contains all redis events.
 */
class ZBotRedis {

  /**
   *
   * @param {redis} redisNode
   * */
  constructor(redisNode) {
    /**
     * @type RedisClient
     */
    this._db = redisNode.createClient();

    this.addEvents();
  }

  get db() {
    return this._db;
  }

  addEvents() {
    this._db.on("error", function (err) {
      console.log("Redis error " + err);
    });
  }

}

module.exports = ZBotRedis;



