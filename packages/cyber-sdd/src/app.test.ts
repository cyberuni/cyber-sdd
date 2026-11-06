import { expect, it, vi } from 'vitest'
import { createApp } from './app.js'
import { VERSION } from './version.js'

it('identifies itself as cyber-sdd-2 at the package version', () => {
	const app = createApp()

	expect(app.name).toBe('cyber-sdd-2')
	expect(app.version).toBe(VERSION)
	expect(app.description).toBe('Spec-Driven Development CLI, second generation')
})

it('answers a bare invocation with its identity, not a manual', async () => {
	const chunks: string[] = []
	const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		chunks.push(String(chunk))
		return true
	})
	try {
		await createApp().parse(['node', 'cyber-sdd-2'])
	} finally {
		spy.mockRestore()
	}
	const out = chunks.join('')

	expect(out).toContain('description: Spec-Driven Development CLI, second generation')
	expect(out).toContain(`version: ${VERSION}`)
})
