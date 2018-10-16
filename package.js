Package.describe({
  name: "serocash:blocks",
  summary: "Provides informations about the current and last 50 blocks",
  version: "1.1.0",
  git: "http://github.com/tomdurrent/meteor-package-blocks"
});

Package.onUse(function(api) {
  api.versionsFrom("1.0");
  api.use("underscore", ["client", "server"]);
  api.use("mongo", ["client", "server"]);

  // api.use('frozeman:persistent-minimongo@0.1.3', 'client');
  api.use("serocash:web3@0.0.1", ["client", "server"]);

  api.export(["SEROBlocks"], ["client", "server"]);

  api.addFiles("blocks.js", ["client", "server"]);
});

// Package.onTest(function(api) {
//   api.use('tinytest');
//   api.use('SERO:blocks');
//   api.addFiles('blocks-tests.js');
// });
