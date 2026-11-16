import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { check, countScenarios } from './check-verification.mts'

const root = mkdtempSync(join(tmpdir(), 'aced-ver-'))
after(() => rmSync(root, { recursive: true, force: true }))
mkdirSync(join(root, 'skills', 'a'), { recursive: true })
mkdirSync(join(root, 'skills', 'b'), { recursive: true })
mkdirSync(join(root, 'skills', 'c'), { recursive: true })
mkdirSync(join(root, '.agents', 'specs', 'x'), { recursive: true })
mkdirSync(join(root, '.agents', 'specs', 'ledger'), { recursive: true })
writeFileSync(join(root, '.agents', 'specs', 'x', 'a.feature'), 'Feature: a\n  Scenario: s\n    Given x\n')
writeFileSync(join(root, '.agents', 'specs', 'x', 'b.feature'), 'Feature: b\n')
writeFileSync(join(root, '.agents', 'specs', 'ledger', 'c.feature'), 'Feature: c\n  Scenario: s\n')

test('a suite with a scenario passes', () => {
	assert.equal(check(join(root, 'skills', 'a')).checks[0]?.status, 'pass')
})
test('a suite with no scenario fails', () => {
	assert.equal(check(join(root, 'skills', 'b')).checks[0]?.status, 'fail')
})
test('a skill with no suite is not checked, and a ledger copy does not count', () => {
	assert.equal(check(join(root, 'skills', 'c')).checks[0]?.status, 'not-checked')
})
test('scenario outlines count', () => {
	assert.equal(countScenarios('Scenario Outline: t\n  Scenario: u\n'), 2)
})
