'use strict';

var config = require('../../../config');
var common = require('phrixus-common')(config); // phrixus-common must be configured before models are referenced!
var models = require('../../src/models');
var controllers = require('../../src/controllers');

module.exports = {
  config: config,
  models: models,
  common: common,
  controllers: controllers
};
