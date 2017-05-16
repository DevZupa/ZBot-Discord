var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "liststats",
  desc: "lets zupa list some stats",
  fn: (argv, context) => {
    if(context.msg.author.id == '111897789654421504') {
      context.zbot.listStats(context.msg.channel);
      if(argv.args.extended == 'true'){
        context.zbot.listExtraStats(context.msg.channel);
      }
    } else {
      context.zbot.printLongMessage('Only Zupa can use this command.', context.msg.channel);
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
