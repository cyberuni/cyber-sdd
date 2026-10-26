#!/usr/bin/env node
/**
 * Tag each private package that changesets has released, after `changeset publish`.
 *
 *   node scripts/tag-private-releases.mjs            create the missing tags
 *   node scripts/tag-private-releases.mjs --dry-run  print them and create nothing
 *
 * A private package never reaches npm, so `changeset publish` tags it only when `privatePackages.tag`
 * is on, and that tags every private package whose version has no tag yet, released or not. This
 * script uses a narrower rule: it tags `<name>@<version>` only when the package's CHANGELOG.md has a
 * `## <version>` entry, which `changeset version` writes when it releases that version. A package
 * held at private with no release yet, such as cyber-quill, is left alone.
 *
 * Each tag is also written as a `git-tag` event to `$CHANGESETS_OUTPUT`, the same event changesets
 * writes, so changesets/action pushes the tag and creates its GitHub release.
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dryRun = process.argv.includes('--dry-run')
// biome-ignore lint/suspicious/noUndeclaredEnvVars: set by changesets/action for the release script, which turbo never runs
const output = process.env.CHANGESETS_OUTPUT

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const tagExists = (tag) =>
	git('tag', '--list', tag) !== '' || git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`) !== ''

const packages = JSON.parse(
	execFileSync('pnpm', ['ls', '--recursive', '--depth', '-1', '--json'], { encoding: 'utf8' }),
)

const tagged = []
for (const { name, version, private: isPrivate, path } of packages) {
	if (!isPrivate || !version) continue
	const changelog = join(path, 'CHANGELOG.md')
	if (!existsSync(changelog)) continue
	const heading = new RegExp(`^## ${version.replaceAll('.', '\\.')}$`, 'm')
	if (!heading.test(readFileSync(changelog, 'utf8'))) continue
	const tag = `${name}@${version}`
	if (tagExists(tag)) continue
	tagged.push(tag)
	if (dryRun) continue
	git('tag', '--annotate', tag, '--message', tag)
	if (output) appendFileSync(output, `${JSON.stringify({ type: 'git-tag', tag, packageName: name })}\n`)
}

const verb = dryRun ? 'would tag' : 'tagged'
process.stdout.write(
	tagged.length ? `${verb} ${tagged.length} private release(s)\n${tagged.join('\n')}\n` : 'no private release to tag\n',
)
