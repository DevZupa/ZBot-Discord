var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "disconnect",
  desc: "lets zupa simulate a disconnect",
  fn: (argv, context) => {
    if(context.msg.author.id == '111897789654421504') {
      context.zbot.bot.emit('disconnect');
    }
  },
  args: [
    {
      name: 'extended',
      desc: 'extended',
      type: 'string',
      required: false,
      default: ''
    }
  ],
  flags: [
   
  ]
});
