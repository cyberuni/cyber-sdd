import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
	type Attestation,
	checkAttestation,
	extractKeyPoints,
	isParroted,
	loadGovernanceFromSkillsDir,
	main,
	parrotOverlapRatio,
	parseAttestation,
} from './read-check.mts'

// ─── fixtures ─────────────────────────────────────────────────────────────────

const KEY_POINTS_TEXT = [
	'1. **No knowledge duplication** — one home per rule; but coincidental resemblance is not duplication',
	'   (do not merge units that change for different reasons). No conflict; contained complexity.',
	'2. **A sound verification pyramid** — cheap base, thin e2e cap; neither all-e2e nor capless.',
	"3. **Per-scenario level is the builder's call; this bar judges the shape.**",
].join('\n')

const GOVERNANCE_WITH_KEY_POINTS = [
	'---',
	'name: sample-governance',
	'---',
	'',
	'# Sample Governance',
	'',
	'## The bar',
	'',
	'Some prose about the bar that is not the key-points section.',
	'',
	'## Key points (read-check)',
	'',
	KEY_POINTS_TEXT,
	'',
	'## Not part of key points',
	'',
	'Trailing section text that must not leak into the extracted key points.',
].join('\n')

const GOVERNANCE_WITHOUT_KEY_POINTS = [
	'---',
	'name: exempt-governance',
	'---',
	'',
	'# Exempt Governance',
	'',
	'## The bar',
	'',
	'This governance carries no Key points (read-check) section at all.',
].join('\n')

// A genuine own-words paraphrase of KEY_POINTS_TEXT — different wording throughout, no run
// of 6+ consecutive shared words. This is the "control" restatement used across tests: it
// must always clear the parrot check.
const OWN_WORDS_RESTATEMENT =
	'Every rule lives in exactly one place, and things that merely look alike but change for ' +
	'separate reasons should stay apart. Also watch for contradictions and keep complexity low. ' +
	'The test pyramid needs a big cheap foundation with only a small end-to-end layer on top — ' +
	'too much e2e is brittle, too little means nothing catches real breakage. Choosing the level ' +
	'for an individual scenario is left to the builder; this bar only checks the overall shape.'

// A parroted restatement — the first sentence is copied verbatim (with only the bold
// markers and "do not"/"don't" trivially altered), well past the 6-word window.
const PARROTED_RESTATEMENT =
	'No knowledge duplication means one home per rule; but coincidental resemblance is not duplication, ' +
	'so you should not merge units that change for different reasons.'

function loaderFor(map: Record<string, string | undefined>) {
	return (name: string): string | undefined => map[name]
}

// ─── extractKeyPoints ───────────────────────────────────────────────────────────

test('extractKeyPoints returns the section body when present', () => {
	const kp = extractKeyPoints(GOVERNANCE_WITH_KEY_POINTS)
	assert.ok(kp?.includes('No knowledge duplication'))
	assert.ok(!kp?.includes('Trailing section text'), 'must stop at the next ## heading')
})

test('extractKeyPoints returns undefined when the section is absent', () => {
	assert.equal(extractKeyPoints(GOVERNANCE_WITHOUT_KEY_POINTS), undefined)
})

// ─── parseAttestation ───────────────────────────────────────────────────────────

test('parseAttestation parses a well-formed attestation', () => {
	const a = parseAttestation(JSON.stringify({ governances: [{ name: 'x', restatement: 'y' }] }))
	assert.deepEqual(a, { governances: [{ name: 'x', restatement: 'y' }] })
})

test('parseAttestation returns undefined on malformed JSON', () => {
	assert.equal(parseAttestation('{not json'), undefined)
})

test('parseAttestation returns undefined when governances is not an array', () => {
	assert.equal(parseAttestation(JSON.stringify({ governances: 'nope' })), undefined)
})

test('parseAttestation drops malformed governance entries but keeps well-formed ones', () => {
	const a = parseAttestation(JSON.stringify({ governances: [{ name: 'ok' }, { no: 'name' }, 42] }))
	assert.deepEqual(a, { governances: [{ name: 'ok', restatement: undefined }] })
})

// ─── D1 — absent ────────────────────────────────────────────────────────────────

test('a missing attestation fails the read-check and reports nothing was attested', () => {
	const v = checkAttestation(undefined, () => undefined)
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /no read-attestation was returned/)
})

test('a present attestation does not fail for absence and proceeds to the lint', () => {
	const v = checkAttestation({ governances: [] }, () => undefined)
	assert.deepEqual(v, [], 'an attestation naming zero loaded governances is not the ABSENT case')
})

// ─── D2 — no key points vs. key points present ─────────────────────────────────

test('a governance with no key-points section is satisfied by naming alone', () => {
	const attestation: Attestation = { governances: [{ name: 'exempt' }] }
	const v = checkAttestation(attestation, loaderFor({ exempt: GOVERNANCE_WITHOUT_KEY_POINTS }))
	assert.deepEqual(v, [])
})

test('a governance with a key-points section requires a restatement', () => {
	const attestation: Attestation = { governances: [{ name: 'sample' }] }
	const v = checkAttestation(attestation, loaderFor({ sample: GOVERNANCE_WITH_KEY_POINTS }))
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /no restatement was attested/)
	assert.match(v[0] ?? '', /sample/)
})

// ─── D3 — omitted vs. complete restatement ─────────────────────────────────────

test('an omitted restatement fails even when the other governance is present', () => {
	const attestation: Attestation = {
		governances: [{ name: 'first', restatement: OWN_WORDS_RESTATEMENT }, { name: 'second' }],
	}
	const v = checkAttestation(
		attestation,
		loaderFor({ first: GOVERNANCE_WITH_KEY_POINTS, second: GOVERNANCE_WITH_KEY_POINTS }),
	)
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /second/)
	assert.ok(!v.some((m) => /first/.test(m)))
})

test('an attestation covering every bound governance clears the lint', () => {
	const attestation: Attestation = {
		governances: [
			{ name: 'first', restatement: OWN_WORDS_RESTATEMENT },
			{ name: 'second', restatement: OWN_WORDS_RESTATEMENT },
		],
	}
	const v = checkAttestation(
		attestation,
		loaderFor({ first: GOVERNANCE_WITH_KEY_POINTS, second: GOVERNANCE_WITH_KEY_POINTS }),
	)
	assert.deepEqual(v, [])
})

// ─── D4 — parroting ─────────────────────────────────────────────────────────────

test('a parroted restatement fails the lint and reports it as copied', () => {
	const attestation: Attestation = { governances: [{ name: 'sample', restatement: PARROTED_RESTATEMENT }] }
	const v = checkAttestation(attestation, loaderFor({ sample: GOVERNANCE_WITH_KEY_POINTS }))
	assert.equal(v.length, 1)
	assert.match(v[0] ?? '', /copied, not read/)
})

test('an own-words restatement is not flagged as copied', () => {
	const attestation: Attestation = { governances: [{ name: 'sample', restatement: OWN_WORDS_RESTATEMENT }] }
	const v = checkAttestation(attestation, loaderFor({ sample: GOVERNANCE_WITH_KEY_POINTS }))
	assert.deepEqual(v, [])
})

// ─── parrotOverlapRatio / isParroted — the threshold directly ──────────────────

test('an identical restatement has overlap ratio 1 and is parroted', () => {
	assert.equal(parrotOverlapRatio(KEY_POINTS_TEXT, KEY_POINTS_TEXT), 1)
	assert.equal(isParroted(KEY_POINTS_TEXT, KEY_POINTS_TEXT), true)
})

test('a completely unrelated restatement has overlap ratio 0 and is not parroted', () => {
	const unrelated = 'The weather today is sunny with a light breeze from the northwest and no chance of rain.'
	assert.equal(parrotOverlapRatio(unrelated, KEY_POINTS_TEXT), 0)
	assert.equal(isParroted(unrelated, KEY_POINTS_TEXT), false)
})

test('a short restatement fully contained in the source is parroted (fallback path)', () => {
	// Fewer than 6 words — exercises the whole-sequence containment fallback, not shingling.
	const short = 'contained complexity'
	assert.equal(isParroted(short, KEY_POINTS_TEXT), true)
})

test('a short restatement NOT contained in the source is not parroted (fallback path, control)', () => {
	const short = 'totally different words'
	assert.equal(isParroted(short, KEY_POINTS_TEXT), false)
})

test('sharing a single short common phrase (below the 6-gram window) does not alone convict', () => {
	// Shares only "no conflict" (2 words) with the source — nowhere near a 6-word run.
	const restatement =
		'Also there should be no conflict between the change and the existing conventions or module boundaries in play here.'
	assert.equal(isParroted(restatement, KEY_POINTS_TEXT), false)
})

// ─── BOUNDARY — scope: only loaded governances are checked ─────────────────────

test('only the governances actually loaded (named in the attestation) are ever checked', () => {
	const loaded: string[] = []
	const attestation: Attestation = {
		governances: [
			{ name: 'loaded-one', restatement: OWN_WORDS_RESTATEMENT },
			{ name: 'loaded-two', restatement: OWN_WORDS_RESTATEMENT },
		],
	}
	const loader = (name: string): string | undefined => {
		loaded.push(name)
		return GOVERNANCE_WITH_KEY_POINTS
	}
	checkAttestation(attestation, loader)
	assert.deepEqual(loaded.sort(), ['loaded-one', 'loaded-two'])
	// The check has no way to reach a declared-but-unloaded governance: nothing else is
	// iterated but attestation.governances, so a role's other three declared bars are
	// structurally never required here.
})

// ─── BOUNDARY — a green lint renders no verdict on honesty ─────────────────────

test('main reports the judged question as open on a clean attestation', () => {
	const root = mkdtempSync(join(tmpdir(), 'read-check-'))
	try {
		const skillsDir = join(root, 'skills')
		mkdirSync(join(skillsDir, 'sample'), { recursive: true })
		writeFileSync(join(skillsDir, 'sample', 'SKILL.md'), GOVERNANCE_WITH_KEY_POINTS)
		const attestationPath = join(root, 'attestation.json')
		writeFileSync(
			attestationPath,
			JSON.stringify({ governances: [{ name: 'sample', restatement: OWN_WORDS_RESTATEMENT }] }),
		)

		const lines: string[] = []
		const restore = process.stdout.write
		process.stdout.write = ((chunk: string) => {
			lines.push(String(chunk))
			return true
		}) as typeof process.stdout.write
		let code: number
		try {
			code = main(['--attestation', attestationPath, '--skills-dir', skillsDir])
		} finally {
			process.stdout.write = restore
		}
		assert.equal(code, 0)
		assert.ok(lines.some((l) => /judged/i.test(l) && /remains open/.test(l)))
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── CLI — absent attestation file end-to-end ──────────────────────────────────

test('main fails closed when the attestation path does not exist', () => {
	const errors: string[] = []
	const restore = console.error
	console.error = (m: string) => errors.push(String(m))
	let code: number
	try {
		code = main(['--attestation', join(tmpdir(), 'read-check-does-not-exist.json'), '--skills-dir', '.'])
	} finally {
		console.error = restore
	}
	assert.equal(code, 1)
	assert.ok(errors.some((m) => /no read-attestation was returned/.test(m)))
})

test('main fails closed when no --attestation flag is given at all', () => {
	assert.equal(main(['--skills-dir', '.']), 1)
})

// ─── loadGovernanceFromSkillsDir — the real filesystem wiring ──────────────────

test('loadGovernanceFromSkillsDir reads a real SKILL.md by governance name', () => {
	const root = mkdtempSync(join(tmpdir(), 'read-check-loader-'))
	try {
		mkdirSync(join(root, 'my-governance'), { recursive: true })
		writeFileSync(join(root, 'my-governance', 'SKILL.md'), GOVERNANCE_WITH_KEY_POINTS)
		const load = loadGovernanceFromSkillsDir(root)
		assert.equal(load('my-governance'), GOVERNANCE_WITH_KEY_POINTS)
		assert.equal(load('does-not-exist'), undefined)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

// ─── control fixture: a genuine attestation against the REAL repo governances ──
// Proves the wiring end-to-end against the actual skills tree, not just synthetic
// fixtures — reads architect-impl-governance's real key points and pairs it with a
// hand-written own-words paraphrase, plus a real no-key-points governance named by itself.

test('control: a genuine attestation against real governance files clears the lint', () => {
	const realSkillsDir = join(import.meta.dirname, '..', '..')
	const attestation: Attestation = {
		governances: [
			{
				name: 'architect-impl-governance',
				restatement:
					'Keep each rule in a single home so a change never has to land twice, but do not force ' +
					"two things together just because they resemble each other if they'd change for unrelated " +
					'reasons. Do not fight existing conventions or the declared layout. Keep the suite pyramid- ' +
					'shaped: mostly cheap fast checks with only a thin end-to-end layer on top, and leave the ' +
					'per-scenario level choice to the builder. Push structural issues in other capabilities out ' +
					'to their own spec instead of fixing them here.',
			},
			{ name: 'lifecycle-governance' },
		],
	}
	const v = checkAttestation(attestation, loadGovernanceFromSkillsDir(realSkillsDir))
	assert.deepEqual(v, [], v.join('\n'))
})
