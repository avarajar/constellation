#!/usr/bin/env node
/**
 * Constellation CLI — project generator entry point.
 */
import { Command } from 'commander';
import { createRequire } from 'node:module';
import {
  registerNewCommand,
  registerListCommand,
  registerValidateCommand,
  registerWebCommand,
  registerInstallCommand,
  registerDefaultAction,
} from './cli/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description: string };

const program = new Command();

program
  .name('constellation')
  .description(pkg.description)
  .version(pkg.version);

registerNewCommand(program);
registerListCommand(program);
registerValidateCommand(program);
registerWebCommand(program);
registerInstallCommand(program);
registerDefaultAction(program);

program.parse();
