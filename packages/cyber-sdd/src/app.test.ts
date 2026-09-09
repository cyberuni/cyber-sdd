import { expect, it } from 'vitest'
import { createApp } from './app.js'
import { VERSION } from './version.js'

it('identifies itself as cyber-sdd-2 at the package version', () => {
	const app = createApp()

	expect(app.name).toBe('cyber-sdd-2')
	expect(app.version).toBe(VERSION)
	expect(app.description).toBe('Spec-Driven Development CLI, second generation')
})
