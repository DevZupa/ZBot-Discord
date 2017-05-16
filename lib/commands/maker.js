var Clapp = require('../modules/clapp-discord');

module.exports = new Clapp.Command({
  name: "maker",
  desc: "displays the maker",
  fn: (argv, context) => {
      return 'All this love comes from Zupa!';
  },
  args: [

  ],
  flags: [
   
  ]
});
