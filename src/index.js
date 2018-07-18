'use strict';

require("babel-polyfill");

const {
  GitHub
} = require('./github');

const yargs = require('yargs')
  .usage('$0 <cmd> [args]')
  .option('token', {
    describe: 'Github\'s oauth2 token to communicate with its apis',
    required: true
  })
  .option('owner', {
    describe: 'The owner of the repository to download',
    required: true
  })
  .option('repository', {
    describe: 'The repository to download',
    required: true
  })
  .option('tag', {
    describe: 'The tag name to download',
    required: true
  })
  .option('filter-asset', {
    describe: 'the assets we\'re interested in keeping (RegExp)'
  })
  .coerce(['filter-asset'], (arg) => {
    return new RegExp(arg)
  })
  .help();

function fatalError(error) {
  if (error.response) {
    const status = error.response.status;
    let body = error.response.data;
    if (body && body.constructor === Buffer) {
      body = body.toString('utf8')
    }
    console.error(`[FATAL] Call to github failed with status ${status}.`, body)
  } else {
    console.error('[FATAL] Error while getting releases.', error)
  }
  process.exit(1)
}

async function main(argv) {
  try {
    const api = new GitHub(argv.token);

    let assets = [];
    for await (const release of api.getReleases(argv.owner, argv.repository, argv.minVersion, argv.filterAsset)) {

      for (const ass of release.assets) {
        assets.push(ass)
      }
    }

    return assets;
  } catch (error) {
    fatalError(error)
  }
}

main(yargs.argv);
