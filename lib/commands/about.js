var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "about",
  desc: "Small introduction",
  fn: (argv, context) => {
      return 'Hi, I am the Zupa Bot! I\'ll try and make the server a better place one step at the time. I\'m currently still in development but together we are going to automate this server for a better and faster friendly experience!';
  },
  args: [

  ],
  flags: [

  ]
});
