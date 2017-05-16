var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "gif",
  desc: "searches & displays a gif",
  fn: (argv, context) => {
    let tags =  context.msg.toString().replace(context.zbot.cfg.prefix + ' gif ', '');
    context.zbot.getGiphyGif(tags, context.msg);
  },
  args: [
    {
      name: 'text',
      desc: 'Gif tags',
      type: 'string',
      required: true,
      default: 'Random'
    }
  ],
  flags: [

  ]
});
