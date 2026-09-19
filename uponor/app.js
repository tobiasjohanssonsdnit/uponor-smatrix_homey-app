'use strict';

const Homey = require('homey');

module.exports = class UponorApp extends Homey.App {
  async onInit() {
    this.log('Uponor Smatrix app initialized');
  }
};
