#!/usr/bin/env node

import { Command } from 'commander'
import commit from './commands/commit'
import unitTests from './commands/unit_tests'
import analyze from './commands/review'
import init from './commands/init'
import config from './commands/config'
import models from './commands/models'

const program = new Command()

program
  .name('cloving')
  .description('Integrate AI into your development workflow for generating commit messages, code reviews, and unit tests.')
  .version('1.0.0')

program
  .command('commit')
  .description('Generate a commit message and commit the changes')
  .option('-s, --silent', 'Run the command without asking for confirmation of submitting prompts')
  .action(commit)

program
  .command('unit-tests')
  .description('Generate unit tests (if you don\'t specify filenames, it will generate tests for commited changes that differ from the main/master branch)')
  .option('-s, --silent', 'Run the command without asking for confirmation of submitting prompts')
  .option('-f, --files <filenames...>', 'Specify filenames for the unit tests')
  .action(unitTests)

program
  .command('models')
  .description('List available models')
  .action(models)

program
  .command('review')
  .description('Review the code for commited changes that differ from the main/master branch')
  .option('-s, --silent', 'Run the command without asking for confirmation of submitting prompts')
  .action(analyze)

program
  .command('init')
  .description('Setup cloving in the current project')
  .option('-s, --silent', 'Run the command without asking for confirmation of submitting prompts')
  .action(init)

program
  .command('config')
  .description('Configure cloving with your API key and models to use')
  .action(config)

program.parse(process.argv)