var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "broadcast",
  desc: "lets zupa broadcast",
  fn: (argv, context) => {
    if(context.msg.author.id == '111897789654421504') {
      context.zbot.broadcastMessage(context.msg.content.toString());
    } else {
      context.zbot.printLongMessage('Only Zupa can use this command.', context.msg.channel);
    }
  },
  args: [

  ],
  flags: [
   
  ]
});
