import { expect, it } from 'vitest'
import { VERSION } from './version.js'

it('exposes the package version', () => {
	expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
})
