"use strict";

var lodash = require('lodash');
var crypto = require('crypto-js');
var fs      = require('fs');

class ZBot
{
  /**
   * Constructor function. Gets called when class is made into a object.
   * @param options
   */
  constructor(options) {

    this._bot = options.bot;
    this._clapp = options.clapp;
    this._query = options.query;
    this._cfg = options.cfg;
    this._defaultConfig = options.defaultConfig;
    this._qs = options.qs;
    this._request = options.request;
    this._bercon = options.bercon;
    this._bercons = [];
    this._logChannel = null;


    this._running = false;

    /**
     *
     * @type {ZBotRedis}
     * @private
     */
    this._redis = options.redis;

    // ZBot specific variables
    this._data = {};

    // Load every command in the commands folder
    fs.readdirSync('./lib/commands/').forEach(file => {
      this._clapp.addCommand(require("../../commands/" + file));
    });

    console.log('ZBot Module ready');
  }

  /**
   * Gets the rcon instances of zbot
   * @returns {Array<BattleNode>}
   */
  get bercons() {
    return this._bercons;
  }

  /**
   * Get all data per guild.
   * @returns {JSON}
   */
  get data() {
    return this._data;
  }

  /**
   *
   * @param {JSON} data
   */
  set data(data) {
    this._data = data;
  }

  /**
   * Returns a list of active guilds used by zbot
   * @returns {Array<Guild>}
   */
  get activeGuilds() {
    return this._activeGuilds;
  }

  /**
   * Gets the Discord bot client
   * @return {Client}
   */
  get bot() {
    return this._bot;
  }

  /**
   * Gets the config
   * @return {Client}
   */
  get cfg() {
    return this._cfg;
  }

  /**
   * Sets the Discord bot client
   * @param {Client} newBot
   */
  set bot(newBot) {
    this._bot = newBot;   // validation could be checked here such as only allowing non numerical values
  }

  /**
   * Internal Getter function for the Query
   * @returns {*}
   */
  getQuery() {
    return this._query;
  }

  /**
   * Internal Getter function for the Discord Bot Client
   * @returns {Client|*}
   */
  getBot() {
    return this._bot;
  }

  /**
   * Internal Getter function for the Discord Clapp object
   * @returns {Clapp.App|*}
   */
  getClapp() {
    return this._clapp;
  }

  /**
   * Gets configs from database
   * @param BattleNode
   */
  getAllSpecificConfigs() {

    this._redis.db.multi().keys("guild:*",  (err, keys) => {
      this._redis.db.mget(keys, (err, results) => {
        //console.log(keys, results);
        this.applyConfigs(keys, results);
        this.initBERcon(null);
      });
    }).exec((err, results) => {
      if(err) {
        console.log(err);
      }
      //console.log(results);
    });
  }

  /**
   * Puts the database configs for each server into the actual bot.
   * @param {Array<string>} keys
   * @param {Array<string>} specificConfigs
   */
  applyConfigs(keys, specificConfigs) {
    keys.forEach((value, index) => {

      let guildId = value.replace('guild:','');
      let guildData = this._data[guildId];

      if(guildData) {
        let specificGuildConfig = JSON.parse(specificConfigs[index]);
        if (specificGuildConfig) {
          this._data[guildId].config.specific = specificGuildConfig;

          this._data[guildId].config.specific.bercon.servers.forEach((beRconData) => {
            if ( beRconData.hasOwnProperty('showChannels') ) {
              beRconData.showChannels = lodash.assign(lodash.clone(this._defaultConfig.showChannels), beRconData.showChannels);
            } else {
              beRconData.showChannels = lodash.clone(this._defaultConfig.showChannels);
            }
          });
        }
      }
    });
  }

  /**
   * Puts the database config for 1 specific server into the actual bot.
   * @param {string} guildId
   * @param {Array<string>} specificConfig
   */
  applyConfig(guildId, specificConfig) {
    let guildData = this._data[guildId];
    if(guildData) {
      let specificGuildConfig = JSON.parse(specificConfig);
      if (specificGuildConfig) {
        guildData.config.specific = specificGuildConfig;
      }

      guildData.config.specific.bercon.servers.forEach((beRconData) => {
        if ( beRconData.hasOwnProperty('showChannels') ) {
          beRconData.showChannels = lodash.assign(lodash.clone(this._defaultConfig.showChannels), beRconData.showChannels);
        } else {
          beRconData.showChannels = lodash.clone(this._defaultConfig.showChannels);
        }
      });

      this._data[guildId] = guildData;
    }
  }

  /**
   * gets the specific config from the DB.
   * @param {Guild} guild
   * @param {Channel|null} channel
   */
  reloadSpecificConfig(guild, channel) {
    this._redis.db.get('guild:' + guild.id, (err, result) => {
      if(result) {
        this.sendTextMessage(channel, 'Reloaded config.' );
        this.logBot('Reloaded config for: ' + guild.name + ' (' + guild.id + ')', null);
        this.applyConfig(guild.id, result);
        this.initBERcon(guild);
      } else {
        this.sendTextMessage(channel, 'No config found for ' + guild.name + ' (' + guild.id + ')' );
        this.logBot('No config found for: ' + guild.name + ' (' + guild.id + ')', null);
      }
    });
  }

  /**
   * Wrapper function that will distribute message commands
   * @param {Message} msg
   */
  checkMessageAction(msg) {
    if(!msg.author.bot) {
      this.checkCliMessagesAction(msg);
      this.checkWelcomeMessagesAction(msg);
      this.checkIconMessagesAction(msg);
      this._bercons.forEach((bercon) => {
        bercon.checkAdminCommand(msg);
      });
    }
  }

  /**
   * Updates the database with the icon score
   * @param {User} user
   * @param {Guild} guild
   * @param {string} icon
   * @param {int} amount
   */
  updateUserIconCount(user, guild, icon, amount) {
    //console.log(user.username, guild.name, icon, amount);
    //return count;
  }

  /**
   * Checks all channel for a specific icon
   * @param {Message} msg
   */
  checkIconMessagesAction(msg) {

    let icon = ":heart:";
    //let regex =  new RegExp('❤', "gu");
    //let regex2 =  new RegExp('\u2764', "gu");
    let regex3 =  new RegExp('\u{2764}', "gu");
    //let regex4 = new RegExp(':heart:', "gu");
    //let regex5 =  new RegExp(':heart:', "g");
    let that = this;

    let content = msg.content.toString();

    let countIcon = (content.match(regex3) || []).length;

    if(countIcon > 0) {

      let mentions = msg.mentions.users;

      if(mentions.length > 0) {

        let reply = '';

        let user = mentions.first();
        /**
         * @type {User} user
         */
        if(user.id != msg.author.id) {

          reply += `${msg.author.toString()} received ${countIcon} ${icon} -> Total of ${newCount} ${icon}\n`;
        } else {
          reply += 'No Self-Love allowed. But it\'s good you love yourself!\n';
        }
      }
    }
  }

  /**
   * Does some checks before sending a text message
   * @param {Channel} channel
   * @param {string} text
   */
  sendTextMessage(channel, text) {
    if (channel) {
      if(channel.type == 'text') {
        channel.sendMessage(text);
      }
    }
  }

  /**
   * Checks all channels for CLI commands to reply to.
   * @param {Message} msg
   */
  checkCliMessagesAction(msg) {
    if (this.getClapp().isCliSentence(msg.content)) {
      this.getClapp().parseInput(msg.content, {
        msg: msg,
        zbot: this,
        // Keep adding properties to the context as you need them
      });
    }
  }

  /**
   * Checks the welcome channel for role messages and gives roles.
   * @param {Message} msg
   */
  checkWelcomeMessagesAction(msg) {
    if(msg.channel.name == 'welcome' && false){
      try {
        let messageContent = [];
        switch (true)
        {
          case (msg.content.includes('/')):
            messageContent = msg.content.split('/');
            break;
          case (msg.content.includes(',')):
            messageContent = msg.content.split(',');
            break;
          case (msg.content.includes('-')):
            messageContent = msg.content.split('-');
            break;
          case (msg.content.includes('_')):
            messageContent = msg.content.split('_');
            break;
          case (msg.content.includes('\\')):
            messageContent = msg.content.split('\\');
            break;
          case (msg.content.includes(' ')):
            // Maybe try spaces... will probably go wrong.
            messageContent = msg.content.split(' ');
            break;
          default:
            console.log('Not a valid ASL.');
        }

        if(messageContent.length > 1) {

          let age = parseInt(messageContent[0].trim());
          let sex = messageContent[1].trim();
          let roles = [];

          if (age > 17) {
            roles.push(msg.guild.roles.find('name', 'Mature'));
          } else {
            roles.push(msg.guild.roles.find('name', 'Kid'));
          }

          if (sex == "F" || sex == "f" || sex == "female" || sex == "girl" || sex == "woman") {
            roles.push(msg.guild.roles.find('name', 'Game Chick'));
          } else {
            roles.push(msg.guild.roles.find('name', 'BodyBuilder'));
          }

          msg.member.addRoles(roles);
        } else {
          this.sendTextMessage( msg.channel, `${msg.member.toString()}. I can't understand that ASL. Can you please try again in the right format?`);
        }

      } catch (e) {
        console.log('Failed to set roles. No permissions or roles don\'t exists', e);
      }
    }
  }

  /**
   * Ask new member/client for ASL data in welcome channel.
   * @param {GuildMember} member
   */
  welcomeClientAction(member) {
    let channel = member.guild.channels.find('name', this.cfg.specific.channels.welcome);
    this.sendTextMessage(channel, `:heart: ${member.toString()}. Welcome to ${member.guild.name}!`);
  }

  /**
   * Ask new member/client for ASL data in welcome channel.
   * @param {GuildMember} member
   */
  leaveClientAction(member) {
    let channel = member.guild.channels .find('name',this.cfg.specific.channels.goodbye);
    let name = (member.nickname ?  member.nickname : member.user.username);
    this.sendTextMessage(channel,`:broken_heart: **${name}** left ${member.guild.name}...`);
  }

  /**
   * Sets the bots it's playing state.
   * @param {string} text
   */
  setBotPlayingState(text) {
    this.getBot().user.setGame(text);
  }

  /**
   * Post the gif in the channel
   * @param {string} id
   * @param {Message} msg
   * @param {string} tags
   */
  postGiphyGif(id, msg, tags) {
    if (typeof id !== "undefined") {
      this.sendTextMessage(msg.channel, `http://media.giphy.com/media/${id}/giphy.gif (Tags: ${tags})`);
    }
    else {
      this.sendTextMessage(msg.channel, `Invalid tags, try again with different tags. (Used tags: ${tags})`);
    }
  }


  /**
   * Search for a gif
   * @param {*} tags
   * @param {Message} msg
   */
  getGiphyGif(tags, msg) {

    let query = this._qs.stringify(this._cfg.giphy);

    if (tags !== null) {
      query += "&tag=" + tags.replace(' ', '+');
    }

    this._request(this._cfg.giphy.url + "?" + query, function (error, response, body) {

      if (error || response.statusCode !== 200) {
        console.error("giphy: Got error: " + body);
        console.log(error);
      }
      else {
        try{
          let responseObj = JSON.parse(body);
          this.postGiphyGif(responseObj.data.id, msg, tags);
        }
        catch(err){
          this.postGiphyGif(undefined, msg, tags);
        }
      }
    }.bind(this));
  }

  /**
   * Logs an action to the admin channel
   * @param {string} message
   * @param {Channel|null} channel
   */
  logBot(message, channel) {
    if(this.cfg.log.enable) {
      console.log(message);
      if(channel) {
        this.printLongMessage(message, channel);
      } else {
        this.printLongMessage(message, this._logChannel);
      }
    }
  }

  /**
   * Initiate all guild data in memory to allow multiple server separate support.
   */
  findAllActiveGuilds() {
    /**
     * @param {Guild} element
     */
    this.bot.guilds.array().forEach((element) => {
      this.logBot(element.id + ' ' + element.name);
      this._data[String(element.id)] = {
        'guild': element,
        'config': lodash.cloneDeep(this._cfg), // default config. Will be overwritten with site config later on.
        'beRcons': [],
        'channels': { // Config for zbot channels - (rcon channels are the rcons object since you can have multiple rcons ervers.)
          'welcome': 'welcome',
          'goodbye': 'welcome'
        }
      };
    });
  }

  /**
   * Add new guild to active guild list.
   * @param {Guild} guild
   */
  addActiveGuild(guild) {
    if (!("key" in this.data)) {
      this.logBot('New Guild: ' + guild.id + ' ' + guild.name);
      this._data[String(guild.id)] = {
        'guild': guild,
        'config': lodash.cloneDeep(this._cfg), // default config. Will be overwritten with site config later on.
        'beRcons': [],
        'channels': { // Config for zbot channels - (rcon channels are the rcons object since you can have multiple rcons ervers.)
          'welcome': 'welcome',
          'goodbye': 'welcome',
        }
      }
    }
  }

  /**
   * Refresh Guild object.
   * @param {Guild} oldGuild
   * @param {Guild} newGuild
   */
  updateGuildData(oldGuild, newGuild) {
    if(oldGuild.id in this.data)
    {
      this._data[String(oldGuild.id)].guild = newGuild;
    }
  }

  /**
   * Wrapper function when a new guild is added to the bot.
   * @param {Guild} guild
   */
  newGuildAction(guild) {
    this.addActiveGuild(guild);
    if(this._cfg.useRedis) {
      this.reloadSpecificConfig(guild, null);
    } else {
      this.initBERcon(null);
    }
  }

  /**
   * Action called when a guild is updated.
   * @param oldGuild
   * @param newGuild
   */
  updateGuildAction(oldGuild, newGuild) {
    this.updateGuildData(oldGuild, newGuild);
  }

  /**
   * Initiate bot functions that need to wait until bot is logged in to the servers.
   */
  initAfterReady() {
    this.setLogChannel();
    if(!this._running) {
      this.findAllActiveGuilds();
      if(this._cfg.useRedis) {
        this.getAllSpecificConfigs();
      } else {
        this.initBERcon(null);
      }
      this._running = true;
    }
  }

  /**
   * Binds the zbot channel for loggin.
   */
  setLogChannel() {
    let guilds = this.bot.guilds;
    if (guilds) {
      let logguild = guilds.find('name','ZBot');
      if(logguild) {
        this._logChannel = logguild.channels.find('name', 'zlog');
      }
    }
  }

  /**
   * Initiate BE Rcon for multiple servers per guild if enabled.
   * @param {null|Guild} guild
   */
  initBERcon(guild) {
    if(guild) {

      // close all active rcons from this guild..

      this._data[String(guild.id)].beRcons.forEach((rcon) => {

        if(rcon.bnode) {

          rcon.cmdDisconnect();
          rcon.cmdExit();

          clearInterval(rcon.bnode.keepalive);

          rcon.bnode.socket.onclose = function () {
          };
          rcon.bnode.socket.close();
          rcon.bnode.emit('disconnected', 'stop');
          rcon.bnode = null;
          lodash.remove(this._bercons, (n) => {
            return n === rcon;
          });
        }
      });

      this._data[String(guild.id)].beRcons = [];

      if (this._data[String(guild.id)].config.specific.bercon.enabled && ( (this._data[String(guild.id)].config.specific.bercon.enabled == true && typeof(this._data[String(guild.id)].config.specific.bercon.enabled) === "boolean") || this._data[String(guild.id)].config.specific.bercon.enabled == 'on')) {
        this._data[String(guild.id)].config.specific.bercon.servers.forEach((beRconData) => {
          let rcon = new this._bercon(this._data[String(guild.id)], beRconData, this._bot, this);
          this._data[String(guild.id)].beRcons.push(rcon);
          this._bercons.push(rcon);
        });
      }
    } else {
      let guildIds = Object.keys(this._data);

      guildIds.forEach((guildId) => {
        if (this._data[guildId].config.specific.bercon.enabled && ( (this._data[String(guildId)].config.specific.bercon.enabled == true && typeof(this._data[String(guildId)].config.specific.bercon.enabled) === "boolean" ) || this._data[String(guildId)].config.specific.bercon.enabled == 'on')) {
          //console.log(guildId, this._data[guildId].config.specific.bercon.servers[0].ip, 'servers');
          this._data[guildId].config.specific.bercon.servers.forEach((beRconData) => {
            // console.log(beRconData.ip);
            let rcon = new this._bercon(this._data[guildId], beRconData, this._bot, this);
            this._data[guildId].beRcons.push(rcon);
            this._bercons.push(rcon);
          });
        }
      });
    }
  }


  /**
   * Encrypts a string with our secret key.
   * @param {string} text
   * @returns {*|CipherParams}
   */
  encryptString(text) {
    return crypto.AES.encrypt(text, this.cfg.encryptionKey);
  }

  /**
   * Decrypts an encrypted text
   * @param {string} encryptedText
   */
  decryptString(encryptedText) {
    let bytes  = crypto.AES.decrypt(ciphertext.toString(), this.cfg.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Broadcast a message to all rcon command discord channels.
   * @param {string} text
   */
  broadcastMessage(text) {
    /**
     * @var {ZBotBERcon} bercon
     */
    this._bercons.forEach((bercon) => {
      this.sendTextMessage(bercon.commandChannel, text.replace('!zbot broadcast ',''));
    });
  }

  /**
   * List some rcon stats
   * @param {Channel} channel
   */
  listStats(channel) {
    this.sendTextMessage(channel,`Zbot is serving in ${this.bot.channels.size} channels on ${this.bot.guilds.size} servers, for a total of ${this.bot.users.size} users.`);
    this.sendTextMessage(channel,`This includes a total of ${this._bercons.length} RCON instances.`);
  }

  /**
   * List all rcon stats
   * @param {Channel} channel
   */
  listExtraStats(channel) {
    let message = 'Guilds:\n\n';

    this._bot.guilds.array().forEach((guild) => {
      message += 'Guild: ' + guild.name + ' (' + guild.id + ')\n';
    });

    message += '\nRCONs:\n\n';

    this._bercons.forEach((bercon) => {
      message += 'Guild: ' + bercon.guild.name + ' -> RCON: ' + bercon.cfg.name + ' - \n';
    });
    this.printLongMessage(message, channel);
  }

  /**
   * List a config from a guild
   * @param {string} guildId
   * @param {channel} channel
   */
  listInfo(guildId, channel) {
    console.log(guildId);
    let guildData = this._data[String(guildId)];

    this.printObject(guildData, channel);
  }

  /**
   * Converts an object to a string.
   * @param {Object|JSON|array|null} object
   * @param {Channel} channel
   */
  printObject(object, channel) {
    this.printLongMessage(JSON.stringify(object, null, 2), channel);
  }

  /**
   * Prints a long message. Discord has a max of 2000 chars per message. BUt we bundle them to the max cus there is also a max messages per second.
   * @param {string} text
   * @param {Channel} channel
   */
  printLongMessage(text, channel) {
    if(text && typeof text == 'string') {
      if (text.length <= 2000) {
        this.sendTextMessage(channel, text);
      } else {
        let bundledMessage = '';
        let newBundledMessage = '';
        let messages = text.split(/\r?\n/);
        if(messages.length == 1) {
          // 1 long text without newlines...
          // Just split it by the max number. ( 2000 )
          messages = text.match(/.{1,1999}/g);
        }
        messages.forEach((textLine, index) => {
          newBundledMessage = newBundledMessage + textLine + '\n';
          if (newBundledMessage.length > 2000) {
            this.sendTextMessage(channel, bundledMessage);
            bundledMessage = textLine + '\n';
            newBundledMessage = textLine + '\n';
          } else {
            bundledMessage = bundledMessage + textLine + '\n';
          }

          if (index == (messages.length - 1)) {
            this.sendTextMessage(channel, bundledMessage);
          }
        });
      }
    }
  }

}

module.exports = ZBot;