"use strict";

var Table      = require('cli-table2');
var lodash = require('lodash');
var schedule = require('node-schedule');
var geoip = require('geoip-lite');
var Gamedig = require('gamedig');
var BattleNode = require('battle-node');

/**
 * Class that handles the RCON part of ZBOT.
 */
class ZBotBERcon
{
  /**
   * Constructor function. Gets called when class is made into a object.
   * @constructor
   * @param {JSON} data
   * @param {JSON} beRconData
   * @param {Client} bot
   * @param {ZBot} zbot
   */
  constructor(data, beRconData, bot, zbot) {
    /**
     * @type {JSON}
     */
    this._cfg = beRconData;

    /**
     * @type {JSON}
     */
    this._data = data;

    /**
     * @type {ZBot}
     */
    this._zbot = zbot;

    /**
     * @type {null|BattleNode}
     * @private
     */
    this._bnode = null;
    /**
     * @type {Client}
     * @private
     */
    this._bot = bot;
    /**
     * @type {Guild}
     */
    this._guild = data.guild;

    /**
     * @type {null|GuildChannel}
     * @private
     */
    this._chatChannel = null; // deprecated
    /**
     * @type {null|Channel}
     * @private
     */
    this._commandChannel = null;
    this._sideChannel = null;
    this._groupChannel = null;
    this._directChannel = null;
    this._adminChannel = null;
    this._connectChannel = null;
    this._vehicleChannel = null;
    this._defaultChannel = null;
    this._globalChannel = null;

    this._continue = false;
    this._cronJobs = [];

    this._loginAttempts = 0;
    this._reLoginAttempts = 0;

    /**
     * @type Array<Object>
     */
    this._actions = lodash.values(this._cfg.actions).concat(lodash.values(this._data.config.specific.bercon.sharedActions));

    this.init();
  }

  /**
   * Getter or the rcon configs
   * @returns {JSON|*}
   */
  get cfg() {
    return this._cfg;
  }

  /**
   * Getter or the bot
   * @returns {JSON|*}
   */
  get bot() {
    return this._bot;
  }

  /**
   * Getter or the rcon configs
   * @returns {Channel|null}
   */
  get commandChannel() {
    return this._commandChannel;
  }

  /**
   *  Getter for the guild connected to this rcon instance.
   * @returns {Guild}
   */
  get guild() {
    return this._guild;
  }

  /**
   * Getter for the BattleNode instance.
   * @returns {null|BattleNode}
   */
  get bnode() {
    return this._bnode;
  }

  /**
   *
   * @param {null|BattleNode} bnode
   */
  set bnode(bnode) {
    this._bnode = bnode;
  }

  /**
   * Initiates the Node Rcon and tries to login
   */
  init() {
    this._bnode = new BattleNode(this._cfg);
    this.bindChannels();
    if(this._continue) {
      console.log('Login ' + this._guild.name + ' : ' + this._defaultChannel.name);
      this._zbot.logBot('Login ' + this._guild.name + ' : ' + this._defaultChannel.name);
      this.initEvents();
      if(this._bnode) {
        this._bnode.login();
      }
    }
  }

  reInit() {
    this._bnode = new BattleNode(this._cfg);
    console.log('Login ' + this._guild.name + ' : ' + this._defaultChannel.name);
    this._zbot.logBot('Login ' + this._guild.name + ' : ' + this._defaultChannel.name);
    this.initEvents();
    if(this._bnode) {
      this._bnode.login();
    }
  }

  initCronJobs() {
    this.cancelCronJobs();
    let jobs = [];
    this._cfg.jobs.forEach((job) => {
        // { 'time': ' ********* ', 'text': 'test' }
      if(job.time) {
        if(job.text) {
          let cronjob = schedule.scheduleJob(job.time,  () => {
            if (job.text) {
              this.cmdSayGlobalMessage(job.text);
            }
          });
          jobs.push(cronjob);
        }
      }
    });
    this._cronJobs = jobs;
    this.sendTextMessage(this._commandChannel, 'Cron Jobs initiated.');
  }

  cancelCronJobs() {
    this._cronJobs.forEach((job) => {
      job.cancel();
    });
    this._cronJobs = [];
  }

  bindChannels() {
    this._commandChannel = this._guild.channels.find('name',this.cfg.channels.commands);
    this._sideChannel = this._guild.channels.find('name',this.cfg.channels.side);
    this._groupChannel = this._guild.channels.find('name',this.cfg.channels.group);
    this._directChannel = this._guild.channels.find('name',this.cfg.channels.direct);
    this._adminChannel = this._guild.channels.find('name',this.cfg.channels.admin);
    this._connectChannel = this._guild.channels.find('name',this.cfg.channels.joins);
    this._vehicleChannel = this._guild.channels.find('name',this.cfg.channels.vehicle);
    this._defaultChannel = this._guild.channels.find('name',this.cfg.channels.default);
    this._globalChannel = this._guild.channels.find('name',this.cfg.channels.global);

    if(this._defaultChannel) {
      if(this._defaultChannel.type == 'text') {
        this._continue = true;
      }
    }
  }

  /**
   * Initiate Node RCON events and binds them to actions.
   */
  initEvents() {
    this._bnode.on('login', (err, success) => {
      this.loginAction(err, success);
    });
    this._bnode.on('message', (message) => {
      this.chatMessagesAction(message);
    });
    this._bnode.on('disconnected', (extra) => {
      this.cancelCronJobs();
      if(extra && extra == 'stop') {
        console.log('RCON stopped on purpose. ZBot reload for ' + this._guild.name);
        this._zbot.logBot('RCON stopped on purpose. ZBot reload for ' + this._guild.name);
        if (this._commandChannel) {
          this.sendTextMessage(this._commandChannel, 'RCON server disconnected on purpose. ZBot reload');
        }

      } else {

        console.log('RCON server disconnected. Trying to reconnect in ' + (this._data.config.rconReconnect / 1000 ) + ' sec for ' + this._guild.name);
        this._zbot.logBot('RCON server disconnected. Trying to reconnect in ' + (this._data.config.rconReconnect / 1000 ) + ' sec for ' + this._guild.name);
        if (this._commandChannel) {
          this.sendTextMessage(this._commandChannel, 'RCON server disconnected. Trying to reconnect in ' + (this._data.config.rconReconnect / 1000 ) + ' sec.');
        }

        let wait = new Promise((resolve, reject) => {
          setTimeout(resolve, this._data.config.rconReconnect)
        }).then(() => {
          console.log('Creating new rcon for ' + this._guild.name);
          this._zbot.logBot('Creating new rcon for ' + this._guild.name);

          if(this._bnode) {
            delete this._bnode;
          }
          this.reInit();
        });
      }
    });
  }

  /**
   * Action performed after login attempt.
   * @param {*} err
   * @param {boolean} success
   */
  loginAction(err, success) {
    if (err) {
      console.log('Unable to connect to server for ' + this._guild.name);
      this._zbot.logBot('Unable to connect to server for ' + this._guild.name);
      if (this._commandChannel) {
        this.sendTextMessage(this._commandChannel, 'Unable to connect to server. Trying to reconnect in ' + (this._data.config.rconReconnect / 1000 ) + ' sec.');
      }
      this._zbot.logBot('LoginAttempts ' + this._loginAttempts);
      if(this._loginAttempts < 60) {
        let wait = new Promise((resolve, reject) => {
          setTimeout(resolve, this._data.config.rconReconnect)
        }).then(() => {
          this._loginAttempts += 1;

          if(this._bnode) {
            delete this._bnode;
          }

          this.reInit();

        });
      } else {
        this.sendTextMessage( this._commandChannel, 'Failed ' + this._loginAttempts + ' times to connect to the gameserver, please check if the server is online. @admin @administrator @rcon-admin');
        this._zbot.logBot('Failed ' + this._loginAttempts + ' times to connect to the gameserver of ' + this._guild.name );
      }
    } else {
      if (success == true) {
        console.log('Logged in RCON successfully for ' + this._guild.name);
        this._zbot.logBot('Logged in RCON successfully for ' + this._guild.name);
        this.sendTextMessage(this._commandChannel, 'Logged in RCON successfully');
        this._loginAttempts = 0;
        this.initCronJobs();
      }
      else if (success == false) {
        console.log('RCON login failed! (password may be incorrect) for ' + this._guild.name);
        this._zbot.logBot('RCON login failed! (password may be incorrect) for ' + this._guild.name);
        if (this._commandChannel) {
          this.sendTextMessage( this._commandChannel, 'RCON login failed! Check your authentications and zbot reload.');
        }
      }
    }
  }

  /**
   * Action called when a chatmessage is published.
   * @param {string} message
   */
  chatMessagesAction(message) {
    let channel = this._defaultChannel;
    let styledMessage = new Date().toLocaleString('en-US', {hour12: false}) + ': ' + message;
    let disableShow = false;

    switch (true) {
      case (message.startsWith('(Side)')):
        styledMessage = '```markdown\n# ' + styledMessage + '\n```';
        channel = this._sideChannel;
        if(!this.cfg.showChannels.side) {
          disableShow = true;
        }
        break;
      case (message.startsWith('(Group)')):
        styledMessage = '```css\n' + styledMessage + '\n```';
        channel = this._groupChannel;
        if(!this.cfg.showChannels.group) {
          disableShow = true;
        }
        break;
      case (message.startsWith('(Direct)')):
        styledMessage = '```py\n# ' + styledMessage + '\n```';
        channel = this._directChannel;
        if(!this.cfg.showChannels.direct) {
          disableShow = true;
        }
        break;
      case (message.startsWith('(Vehicle)')):
        styledMessage = '```fix\n' + styledMessage + '\n```';
        channel = this._vehicleChannel;
        if(!this.cfg.showChannels.vehicle) {
          disableShow = true;
        }
        break;
      case (message.startsWith('(Global)')):
        styledMessage = '```cs\n" ' + styledMessage + ' "\n```';
        channel = this._globalChannel;
        if(!this.cfg.showChannels.global) {
          disableShow = true;
        }
        break;
      case (message.startsWith('RCon admin') ):
        styledMessage = '```py\n@ ' + styledMessage + '\n```';
        channel = this._adminChannel;
        if(!this.cfg.showChannels.admin) {
          disableShow = true;
        }
        break;
      case (message.startsWith('Player #') || message.startsWith('Verified GUID') ):
        styledMessage = '```py\n@ ' + styledMessage + '\n```';
        channel = this._connectChannel;
        if(!this.cfg.showChannels.joins) {
          disableShow = true;
        }
        break;
      default:
        styledMessage = '```\n' + styledMessage + '\n```';
    }

    if(!disableShow) {
      if (channel) {
        this.sendTextMessage(channel, styledMessage);
      } else {
        this.sendTextMessage(this._defaultChannel, 'The specific channel does not exist. Posting in default. Please check your channel config.');
        this.sendTextMessage(this._defaultChannel, styledMessage);
      }
    }

    this.checkMessageForCommand(message, channel, styledMessage);
  }

  /**
   * Checks for commands in the chat message.
   * @param {string} message
   * @param {Channel} channel
   * @param {string} styledMessage
   */
  checkMessageForCommand(message, channel, styledMessage) {
    if(!(message.startsWith('RCon admin'))) {
      this._actions.forEach((action) => {
        if (action.command) {
          if (message.includes(action.command)) {
            if (action.reply) {
              this.cmdSayGlobalMessage(action.reply);
            }
            if (action.discordReply) {
              this.sendTextMessage(this._adminChannel, styledMessage);

              let discordMessage = action.discordReply;

              if (action.role) {
                let role = this._guild.roles.find('name', action.role);
                if (role) {
                  role.members.array().forEach((member) => {
                    discordMessage += ` ${member.toString()}`;
                  });
                }
              }

              this.sendTextMessage(this._adminChannel, discordMessage);
            }
          }
        }
      });
    }
  }

  /**
   *
   * @param {Channel} message
   * @param {string} command
   * @returns {boolean}
   */
  hasCorrectRole(message, command) {
    let role = this._data.config.specific.bercon.permissions[command];
    if(role) {
      let answer = message.member.roles.exists('name', role);
      if(!answer) {
        this.sendTextMessage(message.channel, 'You need the following role to use this command: ' + role);
      }
      return answer
    }
    this.sendTextMessage( message.channel, 'Something is wrong with the configs. Maybe a new command? Check if this command has a role on the webpanel. Otherwise :/ contact Zupa');
    return false;
  }

  /**
   * Checks for commands by admin in discord
   *  * @param {Message} message
   */
  checkAdminCommand(message) {
    //TODO read commands from discord admins

    if (message.channel == this._commandChannel) {

      switch (true)
      {
        case (message.content.includes('!rcon teststeam ')):
          // if(!this.hasCorrectRole(message, 'steam')) {
          //   break;
          // }
          this.cmdSteamTestPrintData(message.content.toString().replace("!rcon teststeam ", ""));
          break;
        case (message.content.includes('!rcon steam')):
          if(!this.hasCorrectRole(message, 'steam')) {
            break;
          }
          this.cmdSteamtPrintData();
          break;
        case (message.content.includes('!rcon players+')):
          if(!this.hasCorrectRole(message, 'players')) {
            break;
          }
          this.cmdPrintAllExtendedPlayers();
          break;
        case (message.content.includes('!rcon players')):
          if(!this.hasCorrectRole(message, 'players')) {
            break;
          }
          this.cmdPrintAllPlayers();
          break;
        case (message.content.includes('!rcon admins')):
          if(!this.hasCorrectRole(message, 'admins')) {

            break;
          }
          this.cmdPrintAllAdmins();
          break;
        case (message.content.includes('!rcon bans')):
          if(!this.hasCorrectRole(message, 'bans')) {

            break;
          }
          this.cmdPrintAllBans();
          break;
        case (message.content.includes('!rcon load scripts')):
          if(!this.hasCorrectRole(message, 'loadScripts')) {

            break;
          }
          this.cmdReloadScripts();
          break;
        case (message.content.includes('!rcon load events')):
          if(!this.hasCorrectRole(message, 'loadEvents')) {

            break;
          }
          this.cmdReloadEvents();
          break;
        case (message.content.includes('!rcon say all ')):
          if(!this.hasCorrectRole(message, 'say')) {

            break;
          }
          this.cmdSayGlobalMessage(message.content.toString().replace("!rcon say all ", ""));
          break;
        case (message.content.includes('!rcon say ')):
          if(!this.hasCorrectRole(message, 'say')) {

            break;
          }
          this.cmdSayPlayerMessage(message.content.toString().replace("!rcon say ", ""));
          break;
        case (message.content.includes('!rcon missions')):
          if(!this.hasCorrectRole(message, 'missions')) {

            break;
          }
          this.cmdGetMissions();
          break;
        case (message.content.includes('!rcon version')):
          if(!this.hasCorrectRole(message, 'version')) {

            break;
          }
          this.cmdGetVersion();
          break;
        case (message.content.includes('!rcon update')):
          if(!this.hasCorrectRole(message, 'update')) {

            break;
          }
          this.cmdGetUpdate();
          break;
        case (message.content.includes('!rcon loadBans')):
          if(!this.hasCorrectRole(message, 'loadBans')) {

            break;
          }
          this.cmdLoadBans();
          break;
        case (message.content.includes('!rcon writeBans')):
          if(!this.hasCorrectRole(message, 'writeBans')) {

            break;
          }
          this.cmdWriteBans();
          break;
        case (message.content.includes('!rcon removeBan ')):
          if(!this.hasCorrectRole(message, 'removeBan')) {

            break;
          }
          this.cmdRemoveBan(message.content.toString().replace("!rcon removeBan ", ""));
          break;
        case (message.content.includes('!rcon ban ')):
          if(!this.hasCorrectRole(message, 'ban')) {

            break;
          }
          this.cmdBan(message.content.toString().replace("!rcon ban ", ""));
          break;
        case (message.content.includes('!rcon addBan ')):
          if(!this.hasCorrectRole(message, 'addBan')) {

            break;
          }
          this.cmdAddBan(message.content.toString().replace("!rcon addBan ", ""));
          break;
        case (message.content.includes('!rcon MaxPing ')):
          if(!this.hasCorrectRole(message, 'MaxPing')) {

            break;
          }
          this.cmdSetMaxPing(message.content.toString().replace("!rcon MaxPing ", ""));
          break;
        case (message.content.includes('!rcon kick ')):
          if(!this.hasCorrectRole(message, 'kick')) {

            break;
          }
          this.cmdKickPlayer(message.content.toString().replace("!rcon kick ", ""));
          break;
        case (message.content.includes('!rcon disconnect')):
          if(!this.hasCorrectRole(message, 'disconnect')) {

            break;
          }
          this.cmdDisconnect();
          break;
        case (message.content.includes('!rcon exit')):
          if(!this.hasCorrectRole(message, 'exit')) {

            break;
          }
          this.cmdExit();
          break;
        case (message.content.includes('!rcon #')):
          if(!this.hasCorrectRole(message, 'serverCommands')) {

            break;
          }
          this.cmdServerCommand(message.content.toString().replace("!rcon ", ""));
          break;
        case (message.content.includes('!rcon') ): // must be last case.
          this.listCommands();
          break;
      }
    }
  }

  /**
   * List all available rcon commands;
   */
  listCommands() {

    let commands = [
      {
        command: 'steam',
        desc: 'get steam data from server'
      },
      {
        command: 'players',
        desc: 'List all players'
      },
      {
        command: 'players+',
        desc: 'List all players with country flag'
      },
      {
        command: 'admins',
        desc: 'List all admins'
      },
      {
        command: 'bans',
        desc: 'List all bans'
      },
      {
        command: 'load scripts',
        desc: 'Reloads all BE scripts'
      },
      {
        command: 'load events',
        desc: 'Reloads all BE events'
      },
      {
        command: 'say all [text]',
        desc: 'Sends text to all users'
      },
      {
        command: 'say [playerId] [text]',
        desc: 'Sends text to specific user id'
      },
      {
        command: 'MaxPing [ping]',
        desc: 'Sets the maxping of the server.'
      },
      {
        command: 'kick [playerId] [reason]',
        desc: 'Kicks player (eg: kick 32 Language pls.)'
      },
      {
        command: 'ban [playerId] [minutes] [reason]',
        desc: 'Bans online player (eg: ban 11 0 Duping) 0 = forever'
      },
      {
        command: 'addBan [GUID|IP] [minutes] [reason]',
        desc: 'Bans on/off player (eg: addBan 127.0.0.1 0 Duping)'
      },
      {
        command: 'removeBan [banId]',
        desc: 'Remove bans (eg: ban 11 )'
      },
      {
        command: 'version',
        desc: 'Display the BattlEye version'
      },
      {
        command: 'update',
        desc: 'Check for a newer BattlEye version'
      },
      {
        command: 'loadBans',
        desc: 'Reload Bans from bans.txt'
      },
      {
        command: 'writeBans',
        desc: 'Rewrite Bans to bans.txt'
      },
      {
        command: 'disconnect',
        desc: 'Disconnects the rcon'
      },
      {
        command: 'exit',
        desc: 'Exits the whole rcon client'
      }
    ];

    let serverCommands = [
      {
        command: '#shutdown',
        desc: 'Shutdown the GAME server'
      },
      {
        command: '#lock',
        desc: 'Locks the GAME server'
      },
      {
        command: '#unlock',
        desc: 'Unlocks the GAME server'
      },
      {
        command: '#missions',
        desc: 'Stops current missions and goes to mission list'
      },
      {
        command: '#reassign',
        desc: 'Moves all players back into the lobby'
      },
      {
        command: '#userlist',
        desc: 'Displays the list of users on the server'
      },
      {
        command: '#kick [serverPlayerId]',
        desc: 'Kicks an online player'
      },
      {
        command: '#exec ban [serverPlayerId]',
        desc: 'Bans an online player'
      },
    ];

    const LINE_WIDTH = 175;

    // Command list
    let table = new Table({
      chars: {
        'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
        'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
        'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
        'middle': ''
      },
      colWidths: [
        Math.round(0.15*LINE_WIDTH), // We round it because providing a decimal number would
        Math.round(0.65*LINE_WIDTH)  // break cli-table2
      ],
      wordWrap: true
    });

    for (let i in commands) {
      table.push([commands[i].command, commands[i].desc]);
    }

    // Command list
    let table2 = new Table({
      chars: {
        'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
        'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
        'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
        'middle': ''
      },
      colWidths: [
        Math.round(0.15*LINE_WIDTH), // We round it because providing a decimal number would
        Math.round(0.65*LINE_WIDTH)  // break cli-table2
      ],
      wordWrap: true
    });

    for (let i in serverCommands) {
      table2.push([serverCommands[i].command, serverCommands[i].desc]);
    }

    let fullMessage = '# ZBot BattlEye RCON commands\n' +
      '\n' +
      '**All commands are prefixed with !rcon**\n' +
      '\n' +
      '## Commands\n\n' +
      table.toString() +
      '\n\n' +
      '**More commands added later**';

    let fullMessage2 =
      '## Server Commands\n\n' +
      '\n' +
      '**All commands are prefixed with !rcon**\n' +
      '\n' +
      table2.toString() +
      '\n\n' +
      '**More commands added later**';

    //this._commandChannel.sendMessage('```Markdown\n' + fullMessage + '```');
    this.printLongMarkupMessage(fullMessage, this._commandChannel);
    this.sendTextMessage(this._commandChannel,'```Markdown\n' + fullMessage2 + '```');
  }

  /**
   * Processes the player list to print a more extended player list.
   * @param {string} text
   * @param {channel} channel
   */
  processPlayerList(text, channel) {
    // First we split all the lines
    let lines = text.split(/\r?\n/);

    // temp player object array;
    let players = [];

    // Command list
    let table = new Table({
      chars: {
        'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
        'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
        'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
        'middle': ''
      },
      colWidths: [
        Math.round(5), // id
        Math.round(10),  // flag
        Math.round(30), // Name
        Math.round(10), // ping
        Math.round(20), // IP
        Math.round(10), // port
        Math.round(100) // GUID
      ],
      wordWrap: true
    });


    let message = '| ID | Flag | Name | Ping | IP | Port | GUID |\n';
    message+= '|---|---|---|---|---|---|---|\n';


    //table.push(['ID', 'Flag', 'Name', 'Ping', 'IP', 'Port',  'GUID']);

    lines.splice(0,3); // Remove the first 3 lines..

    lines.forEach((line) => {
      if (!line.includes('players in total') && !line.includes('player in total') ) {
        let player = {
          id: '',
          flag: '',
          name: '',
          ping: '',
          ip: '',
          port: '',
          guid: '',

        };
         //0   78.118.153.156:2304   141  a79082b524def715d18dd3cd924dc1d9(OK) Gamer-Rafale
        let elements = line.split(" ");

        let index = 0;

        elements.forEach((el) => {
          if(el) {
              switch (index) {
                case 0:
                  player.id = el;
                  break;
                case 1:
                  let ipport = el.split(':');
                  player.ip = ipport[0];
                  player.port = ipport[1];
                  break;
                case 2:
                  player.ping = el;
                  break;
                case 3:
                  player.guid = el;
                  if(el == '-1') {
                    player.guid = 'Joining';
                  }
                  break;
                case 4:
                  player.name = el;
                  break;
                default:
                  player.name += ' ' + el;
              }
              index++;
          }
        });

        let geo = geoip.lookup(player.ip);

        if(geo) {
          player.flag = ':flag_' + geo.country.toLowerCase() + ':';
        }

        table.push([player.id, player.flag, player.name, player.ping, player.ip, player.port, player.guid]);

        message += '' + player.id + ' | ' + player.flag + ' | ' + player.name + ' | ' + player.ping + ' | ' + player.ip + ' | ' + player.port + ' | ' + player.guid + ' \n'


      }
    });

    //let message = table.toString();

    this.printLongMessage(message, channel);
  }

  /**
   * Prints a long message. Discord has a max of 2000 chars per message. BUt we bundle them to the max cus there is also a max messages per second.
   * @param {string} text
   * @param {Channel} channel
   */
  printLongMarkupMessage(text, channel) {
    if(text.length <= 1980) {
      this.sendTextMessage(channel, '```Markdown\n' + text + '\n```');
    } else {
      let bundledMessage = '';
      let newBundledMessage = '';
      let messages = text.split(/\r?\n/);
      messages.forEach((textLine, index) => {
        newBundledMessage = newBundledMessage + textLine + '\n';
        if(newBundledMessage.length > 1980) {
          this.sendTextMessage(channel,'```Markdown\n' + bundledMessage + '```');
          bundledMessage = textLine + '\n';
          newBundledMessage = textLine + '\n';
        } else {
          bundledMessage = bundledMessage + textLine + '\n';
        }

        if(index == (messages.length - 1)) {
          this.sendTextMessage(channel, '```Markdown\n' + bundledMessage + '```')
        }
      });
    }
  }

  /**
   * Prints a long message. Discord has a max of 2000 chars per message. BUt we bundle them to the max cus there is also a max messages per second.
   * @param {string} text
   * @param {Channel} channel
   */
  printLongQuotedMessage(text, channel) {
    if(text.length <= 1980) {
      this.sendTextMessage(channel, '```\n' + text + '\n```');
    } else {
      let bundledMessage = '';
      let newBundledMessage = '';
      let messages = text.split(/\r?\n/);
      messages.forEach((textLine, index) => {
        newBundledMessage = newBundledMessage + textLine + '\n';
        if(newBundledMessage.length > 1980) {
          this.sendTextMessage(channel,'```\n' + bundledMessage + '```');
          bundledMessage = textLine + '\n';
          newBundledMessage = textLine + '\n';
        } else {
          bundledMessage = bundledMessage + textLine + '\n';
        }

        if(index == (messages.length - 1)) {
          this.sendTextMessage(channel, '```\n' + bundledMessage + '```')
        }
      });
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
        channel.send(text).catch(console.error);
      }
    }
  }

  /**
   * Prints a long message. Discord has a max of 2000 chars per message. BUt we bundle them to the max cus there is also a max messages per second.
   * @param {string} text
   * @param {Channel} channel
   */
  printLongMessage(text, channel) {
    if(text.length <= 2000) {
      this.sendTextMessage(channel, text);
    } else {
      let bundledMessage = '';
      let newBundledMessage = '';
      let messages = text.split(/\r?\n/);
      messages.forEach((textLine, index) => {
        newBundledMessage = newBundledMessage + textLine + '\n';
        if(newBundledMessage.length > 2000) {
          this.sendTextMessage(channel, bundledMessage);
          bundledMessage = textLine + '\n';
          newBundledMessage = textLine + '\n';
        } else {
          bundledMessage = bundledMessage + textLine + '\n';
        }

        if(index == (messages.length - 1)) {
          this.sendTextMessage(channel, bundledMessage);
        }
      });
    }
  }

  /**
   * Executes a server command
   * @param {string} command
   */
  cmdServerCommand(command) {
    this._bnode.sendCommand(command, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Returns a list of the available missions on the server.
   */
  cmdGetMissions() {
    this._bnode.sendCommand('missions', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * (Re)load the BE ban list from bans.txt in your BE working directory. This command is automatically issued on server launch.
   */
  cmdLoadBans() {
    this._bnode.sendCommand('loadBans', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Re-write the current ban list to bans.txt. This command can be used to remove expired bans.
   */
  cmdWriteBans() {
    this._bnode.sendCommand('writeBans', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);;
      }
    });
  }

  /**
   * Returns the BattlEye version
   */
  cmdGetVersion() {
    this._bnode.sendCommand('version', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Returns if there is a BattlEye update
   */
  cmdGetUpdate() {
    this._bnode.sendCommand('update', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Kicks a player with a reason.
   * @param kickData
   */
  cmdKickPlayer(kickData) {
    this._bnode.sendCommand('kick ' + kickData, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Removes a specific ban.
   * @param {string} banId
   */
  cmdRemoveBan(banId) {
    this._bnode.sendCommand('removeBan ' + banId, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Bans an online player
   * @param {string} banData
   */
  cmdBan(banData) {
    this._bnode.sendCommand('ban ' + banData, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Bans an online or offline player
   * @param {string} banData
   */
  cmdAddBan(banData) {
    this._bnode.sendCommand('addBan ' + banData, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Sets max allowed ping
   * @param {string} ping
   */
  cmdSetMaxPing(ping) {
    this._bnode.sendCommand('MaxPing ' + ping, (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Disconnects the rcon.
   */
  cmdDisconnect() {
    this.sendTextMessage(this._commandChannel, 'Sending disconnect command.');
    this._bnode.sendCommand('disconnect', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Exits the rcon conection
   */
  cmdExit() {
    this.sendTextMessage(this._commandChannel, 'Sending exit command.');
    this._bnode.sendCommand('exit', (message) => {
      if(message) {
        this.sendTextMessage(this._commandChannel, message);
      }
    });
  }

  /**
   * Prints all players
   */
  cmdPrintAllPlayers() {
    this._bnode.sendCommand('players', (players) => {
      this.printLongMessage(players, this._commandChannel);
    });
  }

  cmdPrintAllExtendedPlayers() {
    this._bnode.sendCommand('players', (players) => {
      this.processPlayerList(players, this._commandChannel);
    });
  }

  /**
   * Prints all rcon & admins connected.
   */
  cmdPrintAllAdmins() {
    this._bnode.sendCommand('admins', (admins) => {
      this.printLongMessage(admins, this._commandChannel);
    });
  }

  /**
   * Prints all bans.
   */
  cmdPrintAllBans() {
    this._bnode.sendCommand('bans', (bans) => {
      this.printLongMessage(bans, this._commandChannel);
    });
  }

  /**
   * Sends a global message to all players online in the server
   * @param {string} text
   */
  cmdSayGlobalMessage(text) {
    this._bnode.sendCommand('say -1 ' + text);
  }

  /**
   * Sends a message to a single person, needs ID as first parameter
   * @param {string} text
   */
  cmdSayPlayerMessage(text) {
    this._bnode.sendCommand('say ' + text);
  }

  /**
   * (Re)load the client-side script scans/filters (explained below). This command is automatically issued on server launch.
   */
  cmdReloadScripts() {
    this._bnode.sendCommand('loadScripts');
  }

  /**
   * (Re)load the server-side event filters (explained below). This command is automatically issued on server launch.
   */
  cmdReloadEvents() {
    this._bnode.sendCommand('loadEvents');
  }

  /**
   * Gets data from steam.
   */
  cmdSteamPrintData() {
    Gamedig.query(
      {
        type: (this._cfg.game ? this._cfg.game : 'arma3'),
        host: (this._cfg.ip ? this._cfg.ip : '127.0.0.1'),
        port: (this._cfg.steamport ? this._cfg.steamport : '2303'),
      },
      function(state) {
        if(state.error) {
          console.log("Server is offline");
        } else {
          console.log(state);




        }
      }
    );
  }

  /**
   * Gets data with test parameters
   * @param {string} message
   */
  cmdSteamTestPrintData(message) {
    let data = message.split(':');

    console.log('testing arma3 ' + data[0] + ' : ' + data[1]);

    Gamedig.query(
      {
        type: 'arma3',
        host: data[0].trim(),
        port: parseInt(data[1].trim()),
        port_query: parseInt(data[2].trim()),
      },
      (state) => {
        if(state.error) {
          console.log("Server is offline");
          this._zbot.logBot(JSON.stringify(state, null, 2));
          console.log(state);
        } else {
          console.log(state);
          // this._zbot.logBot(JSON.stringify(state, null, 2));

          if(state.players) {
            state.players.forEach((player) => {

            });
          }
        }
      }
    );
  }


}

module.exports = ZBotBERcon;
