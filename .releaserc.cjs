'use strict';
const { makeConfig } = require('@webgrip/semantic-release-config');
const { graftPinnedTagsOntoBranch } = require('./scripts/release-pinned-tag.cjs');

graftPinnedTagsOntoBranch(__dirname);

const config = makeConfig();

module.exports = { ...config, plugins: [...config.plugins, require.resolve('./scripts/release-pinned-tag.cjs')] };
