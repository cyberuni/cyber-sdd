#!/usr/bin/env node
import { createApp } from './app.js'

createApp()
	.parse(process.argv)
	.catch((error: unknown) => {
		console.error(`cyber-sdd-2: ${error instanceof Error ? error.message : String(error)}`)
		process.exit(1)
	})
