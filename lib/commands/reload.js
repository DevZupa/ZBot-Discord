var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "reload",
  desc: "reloads bot config and reboots",
  fn: (argv, context) => {
    /** @var {Message} context.msg */
    context.zbot.reloadSpecificConfig(context.msg.guild, context.msg.channel);
  },
  args: [

  ],
  flags: [
   
  ]
});
