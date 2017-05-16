var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "awesome",
  desc: "makes you awesome",
  fn: (argv, context) => {
    // This output will be redirected to your app's onReply function

      if(argv.args.name == 'Zupa'){
        return 'Damn! ' + argv.args.name + ' is fucking awesome!';
      }

    return 'Wow! ' + argv.args.name + ' sucks big time...';
  },
  args: [
    {
      name: 'name',
      desc: 'Person\'s name',
      type: 'string',
      required: true,
      default: 'Name isn\'t defined'
    }
  ],
  flags: [

  ]
});
