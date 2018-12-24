Package.describe({
    name: 'serocash:blocks',
    summary: 'Provides informations about the current and last 50 blocks',
    version: '0.2.2',
    git: 'http://github.com/tomdurrent/meteor-package-blocks'
});

Package.onUse(function (api) {
    api.versionsFrom('1.0');
    api.use('underscore', ['client', 'server']);
    api.use('mongo@1.1.7', ['client', 'server']);

    // api.use('frozeman:persistent-minimongo@0.1.3', 'client');
    api.use('serocash:web3@0.2.6', ['client', 'server']);

    api.export(['SeroBlocks'], ['client', 'server']);

    api.addFiles('blocks.js', ['client', 'server']);
});

// Package.onTest(function(api) {
//   api.use('tinytest');
//   api.use('serocash:blocks');
//   api.addFiles('blocks-tests.js');
// });
