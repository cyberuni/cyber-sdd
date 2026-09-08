#!/usr/bin/env node
import { Command } from 'commander'
import { VERSION } from './version.js'

const program = new Command()

program.name('cyber-sdd-2').description('Spec-Driven Development CLI, second generation').version(VERSION)

program.parseAsync(process.argv).catch((error: unknown) => {
	console.error(`cyber-sdd-2: ${error instanceof Error ? error.message : String(error)}`)
	process.exitCode = 1
})
