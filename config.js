module.exports = {

  // Your bot name. Typically, this is your bot's username without the discriminator.
  // i.e: if your bot's username is MemeBot#0420, then this option would be MemeBot.
  name: "Z-Bot",

  version: "1.0.0",

  // The bot's command prefix. The bot will recognize as command any message that begins with it.
  // i.e: "-z-bot foo" will trigger the command "foo",
  //      whereas "Z-Bot foo" will do nothing at all.
  prefix: "!zbot",

  // Your bot's user token. If you don't know what that is, go here:
  // https://discordapp.com/developers/applications/me
  // Then create a new application and grab your token.

  // token: "production-key", // Production token (ZBot)
  token: "test-key", // Test token (Z-Bot (Dev))

  // Key to get youtube songs.
  youtube_data_key: "AIzaSyDRaPYpfRZlp_lGk5Myj5euc_y-7C1iI1s", // not supported in this version of the bot.

  encryptionKey: 'a-unique-string',

  defaultPlayingStatus: 'RCon - Client',

  giphy: {
    api_key: "dc6zaTOxFJmzC",
    rating: "r",
    url: "http://api.giphy.com/v1/gifs/random",
    permission: ["NORMAL"],
    format: "json",
    limit: 1
  },

  // If this option is enabled, the bot will delete the message that triggered it, and its own
  // response, after the specified amount of time has passed.
  // Enable this if you don't want your channel to be flooded with bot messages.
  // ATTENTION! In order for this to work, you need to give your bot the following permission:
  // MANAGE_MESSAGES - 	0x00002000
  // More info: https://discordapp.com/developers/docs/topics/permissions
  deleteAfterReply: {
    enabled: false,
    time: 10000 // In milliseconds
  },

  log: {
    enable: true,
    channel: 'admin-log'
  },

  rconReconnect: 30000, // miliseconds to keep connecting to a server before giving up.

  specificLoaded: false, // keep it false.

  useRedis: false, // to use redis. Redis will override the 'specific' config ( From the webpanel ). If you use this script localy, redis is not supported.

  specific: {
    "guildId": "25xxxxxxxxx1754",
    "channels": {
      "welcome": "",
      "goodbye": ""
    },
    "bercon": {
      "enabled": true,
      "colors": true,
      "permissions": {
        "players": "rcon-admin",
        "admins": "rcon-admin",
        "bans": "rcon-admin",
        "loadScripts": "rcon-admin",
        "loadEvents": "rcon-admin",
        "say": "rcon-admin",
        "missions": "rcon-admin",
        "version": "rcon-admin",
        "update": "rcon-admin",
        "loadBans": "rcon-admin",
        "writeBans": "rcon-admin",
        "removeBan": "rcon-admin",
        "ban": "rcon-admin",
        "addBan": "rcon-admin",
        "MaxPing": "rcon-admin",
        "kick": "rcon-admin",
        "disconnect": "rcon-admin",
        "exit": "rcon-admin",
        "serverCommands": "rcon-admin"
      },
      "sharedActions": [
        {
          "command": "!test",
          "reply": "testing2",
          "discordReply": "Test",
          "role": "rcon-admin"
        }
      ],
      "servers": [
        {
          "id": 0,
          "name": "Zupa King of the hill",
          "ip": "127.0.0.1",
          "port": "2307",
          "rconPassword": "password",
          "channels": {
            "side": "rcon",
            "direct": "rcon",
            "vehicle": "rcon",
            "group": "rcon",
            "admin": "rcon",
            "default": "rcon",
            "commands": "rcon",
            "joins": "rcon",
            "global": "rcon"
          },
          "showChannels": {
            "side": false,
            "direct": true,
            "vehicle": true,
            "group": true,
            "admin": true,
            "default": true,
            "commands": true,
            "joins": true,
            "global": true
          },
          "actions": [
            {
              "command": "!test",
              "reply": "testing",
              "discordReply": "@rcon-admin yolo",
              "role": ""
            }
          ],
          "jobs": [
            {
              "time": "",
              "text": ""
            }
          ]
        },
        {
          "id": 1,
          "name": "Zupa Exile",
          "ip": "127.0.0.1",
          "port": "3307",
          "rconPassword": "password",
          "channels": {
            "side": "rcon_test_2",
            "direct": "rcon_test_2",
            "vehicle": "rcon_test_2",
            "group": "rcon_test_2",
            "admin": "rcon_test_2",
            "default": "rcon_test_2",
            "commands": "rcon_test_2",
            "joins": "rcon_test_2",
            "global": "rcon_test_2"
          },
          "showChannels": {
            "side": true,
            "direct": true,
            "vehicle": true,
            "group": true,
            "admin": true,
            "default": true,
            "commands": true,
            "joins": true,
            "global": true
          },
          "actions": [
            {
              "command": "",
              "reply": "",
              "discordReply": "",
              "role": ""
            }
          ],
          "jobs": [
            {
              "time": "",
              "text": ""
            }
          ]
        }
      ]
    }
  }
};
