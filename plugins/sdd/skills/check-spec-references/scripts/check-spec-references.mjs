#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/check-spec-references/check-spec-references.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.6.1","entry":"skills/check-spec-references/scripts/check-spec-references.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/check-spec-references/check-spec-references.mts
/** Suppresses every reference on the line it appears on. Matched as a COMPLETE html comment, not
* as a substring: a marker whose name merely starts with this one's (a typo, a future sibling)
* must not silently inherit its power to hide a reference. The optional `: reason` is convention,
* not syntax — the marker is recognized with or without one. */
const IGNORE_MARKER_RE = /<!--\s*spec-ref-ignore\s*(?::[^>]*)?-->/;
/** A markdown inline link whose target is explicitly relative — covering the plain form, an
* angle-bracket-wrapped target, and an optional title in any of markdown's three quotings. Run only
* over the parts of a line that are NOT inside a code span: inside one, markup is literal text on
* display, not a link. */
const LINK_RE = /\]\(\s*(?:<([^>\n]*)>|(\.{1,2}\/[^)\s]*))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
/** A reference-style link definition (`[label]: ../path`) whose target is explicitly relative. It
* is a link target like any other — the label form changes where the path is written, not what it
* points at. */
const LINK_DEF_RE = /^\s{0,3}\[.+\]:\s*(?:<([^>\n]*)>|(\S+))/;
/** An explicitly-relative path, and nothing else. The trailing class excludes whitespace and
* backticks so that "the span's WHOLE content is the path" means what it says: a span holding
* `../a` plus commentary is prose that starts with a path, not a citation. */
const RELATIVE_RE = /^\.{1,2}\/[^\s`]*$/;
/** The same, minus the no-whitespace rule — for an ANGLE-BRACKET link target, whose whole reason
* for existing is to carry a path with a space in it. */
const RELATIVE_IN_ANGLES_RE = /^\.{1,2}\/[^`]*$/;
/**
* The fence a line opens, or `undefined`. CommonMark: three or more backticks or tildes, indented
* fewer than four spaces.
*/
function fenceOpenedBy(line) {
	const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
	if (m === null) return void 0;
	const run = m[1];
	return {
		char: run[0],
		length: run.length
	};
}
/**
* Whether `line` CLOSES `fence`: the same character, at least as long, and nothing but whitespace
* after it.
*
* Matching the delimiter rather than toggling a boolean on any fence-shaped line is what keeps the
* exclusion honest. A bare toggle flips on a `~~~` line inside a backtick fence — so a reference
* genuinely inside a fence gets extracted, and, worse, a fence-shaped line inside another fence
* leaves the parity inverted and every genuinely broken reference AFTER the block is silently
* swallowed. That is this engine's own failure class, reached through the one rule meant to
* suppress noise.
*/
function fenceClosedBy(line, fence) {
	const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
	if (m === null) return false;
	const run = m[1];
	return run[0] === fence.char && run.length >= fence.length;
}
/**
* A line that starts a new block: blank, an ATX heading, a blockquote, a list item, or a thematic
* break. Inline parsing happens WITHIN a block, so a code span cannot reach across one of these —
* and the boundary matters in the under-reporting direction. An unclosed backtick left by a typo
* would otherwise pair with the first backtick of the next block, swallowing the span that was
* about to open and every reference after it in the flow.
*/
function startsNewBlock(line) {
	if (/^[ \t]*$/.test(line)) return true;
	if (/^ {0,3}#{1,6}(\s|$)/.test(line)) return true;
	if (/^ {0,3}>/.test(line)) return true;
	if (/^ {0,3}([-+*]|\d{1,9}[.)])(\s|$)/.test(line)) return true;
	if (/^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/.test(line)) return true;
	return false;
}
/** Same length, same line breaks, no content — so blanking a region shifts no offset and moves no
* finding to another line. */
function blankOut(region) {
	return region.replace(/[^\n]/g, " ");
}
/**
* The inline-code spans on one line, scanned the way CommonMark delimits them: a run of N backticks
* opens, the next run of EXACTLY N closes, and one leading + trailing space is stripped when both
* are present.
*
* Scanning properly rather than matching a single-backtick pair is what makes the reference rule —
* "a code span is a reference when its WHOLE content is the path" — mean one thing everywhere. A
* doubled span written around another span (`` `x` ``) has content that still carries backticks, so
* it is not a path and not a reference; a doubled span written around a bare path has the path as
* its content, so it IS one. Neither is a special case, and neither leaves a broken reference
* anywhere to hide.
*/
function scanCodeSpans(text, blockStarts = []) {
	const out = [];
	let i = 0;
	while (i < text.length) {
		if (text[i] !== "`") {
			i++;
			continue;
		}
		const open = i;
		while (text[i] === "`") i++;
		const runLength = i - open;
		const limit = blockStarts.find((b) => b > open) ?? text.length;
		let j = i;
		let closeStart = -1;
		while (j < limit) {
			if (text[j] !== "`") {
				j++;
				continue;
			}
			const runStart = j;
			while (text[j] === "`") j++;
			if (j - runStart === runLength) {
				closeStart = runStart;
				break;
			}
		}
		if (closeStart === -1) {
			i = open + runLength;
			continue;
		}
		let content = text.slice(open + runLength, closeStart).replace(/\r?\n/g, " ");
		if (content.length > 1 && content.startsWith(" ") && content.endsWith(" ") && content.trim() !== "") content = content.slice(1, -1);
		out.push({
			content,
			start: open,
			end: j
		});
		i = j;
	}
	return out;
}
/**
* Every explicitly-relative reference in `text`, in document order.
*
* Skipped: lines inside a fenced code block, and lines carrying the ignore marker. Extraction is
* line-scoped on purpose — it is what gives each finding a line number, and what lets the marker's
* scope be exactly the line it appears on rather than the whole file.
*/
function extractReferences(text) {
	const lines = text.split("\n");
	let fence;
	const unfenced = lines.map((line) => {
		if (fence !== void 0) {
			if (fenceClosedBy(line, fence)) fence = void 0;
			return blankOut(line);
		}
		const opened = fenceOpenedBy(line);
		if (opened !== void 0) {
			fence = opened;
			return blankOut(line);
		}
		return line;
	});
	const scannable = unfenced.join("\n");
	const lineStarts = [];
	let acc = 0;
	for (const line of lines) {
		lineStarts.push(acc);
		acc += line.length + 1;
	}
	const blockStarts = lineStarts.filter((_start, i) => i > 0 && startsNewBlock(unfenced[i]));
	const lineOf = (offset) => {
		let lo = 0;
		let hi = lineStarts.length - 1;
		while (lo < hi) {
			const mid = lo + hi + 1 >> 1;
			if (lineStarts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return lo;
	};
	const spans = scanCodeSpans(scannable, blockStarts);
	let outsideSpans = scannable;
	for (const span of spans) outsideSpans = outsideSpans.slice(0, span.start) + blankOut(outsideSpans.slice(span.start, span.end)) + outsideSpans.slice(span.end);
	const outsideLines = outsideSpans.split("\n");
	const marked = outsideLines.map((line) => IGNORE_MARKER_RE.test(line));
	const perLine = /* @__PURE__ */ new Map();
	const add = (line, ref) => {
		if (marked[line] === true) return;
		const set = perLine.get(line) ?? /* @__PURE__ */ new Set();
		set.add(ref);
		perLine.set(line, set);
	};
	for (const span of spans) {
		const content = span.content.trim();
		if (RELATIVE_RE.test(content)) add(lineOf(span.start), content);
	}
	outsideLines.forEach((line, i) => {
		const addTarget = (angled, bare) => {
			if (angled !== void 0) {
				if (RELATIVE_IN_ANGLES_RE.test(angled)) add(i, angled);
				return;
			}
			if (bare !== void 0 && RELATIVE_RE.test(bare)) add(i, bare);
		};
		for (const m of line.matchAll(LINK_RE)) addTarget(m[1], m[2]);
		const def = LINK_DEF_RE.exec(line);
		if (def) addTarget(def[1], def[2]);
	});
	const out = [];
	for (const line of [...perLine.keys()].sort((a, b) => a - b)) for (const ref of perLine.get(line)) out.push({
		line: line + 1,
		ref
	});
	return out;
}
/**
* Where `ref` points, resolved against `fileDir` — the directory of the file that CARRIES it,
* never the spec root and never the repo root. A trailing `#fragment` is stripped first; a
* trailing slash is immaterial (`resolve` drops it), so a directory reference resolves either way.
*/
function resolveReference(fileDir, ref) {
	const withoutFragment = ref.replace(/#.*$/, "");
	return resolve(fileDir, withoutFragment);
}
/** Every `.md` file under `dir`, at any depth, absolute and sorted so the report is stable. */
function listMarkdownFiles(dir) {
	const out = [];
	const walk = (d) => {
		for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
			const p = join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith(".md")) out.push(p);
		}
	};
	walk(dir);
	return out;
}
/**
* Every unresolved reference under `specDir`, ordered by file, then line, then reference — so two
* runs over an unchanged tree render byte-identically.
*
* EVERY finding, never the first: a single off-by-one lands as a whole family of broken
* references, and reporting one at a time would take as many runs to clear as there are levels
* wrong.
*/
function audit(specDir, options = {}) {
	const list = options.listMarkdownFiles ?? listMarkdownFiles;
	const read = options.readFile ?? ((p) => readFileSync(p, "utf8"));
	const has = options.exists ?? existsSync;
	const findings = [];
	for (const file of list(specDir)) {
		const fileDir = dirname(file);
		for (const { line, ref } of extractReferences(read(file))) {
			const resolved = resolveReference(fileDir, ref);
			if (!has(resolved)) findings.push({
				file,
				line,
				ref,
				resolved
			});
		}
	}
	return findings.sort((a, b) => a.file !== b.file ? a.file < b.file ? -1 : 1 : a.line !== b.line ? a.line - b.line : a.ref < b.ref ? -1 : 1);
}
/** Renders each finding as `file:line: <ref> -> <resolved>`, both paths relative to `base` so the
* report reads the same from any checkout. */
function formatFindings(findings, base) {
	if (findings.length === 0) return "check-spec-references: every relative reference resolves\n";
	const lines = findings.map((f) => `  ${relative(base, f.file)}:${f.line}: \`${f.ref}\` -> ${relative(base, f.resolved)} — no file or directory there\n`);
	lines.push(`check-spec-references: ${findings.length} unresolved reference(s)\n`);
	return lines.join("");
}
function main(argv, cwd = process.cwd()) {
	const i = argv.indexOf("--spec-dir");
	const specDir = i === -1 ? "" : argv[i + 1] ?? "";
	if (specDir === "") {
		process.stderr.write("check-spec-references: --spec-dir <dir> is required\n");
		return 1;
	}
	const dir = resolve(cwd, specDir);
	if (!existsSync(dir)) {
		process.stderr.write(`check-spec-references: no directory at ${relative(cwd, dir)}\n`);
		return 1;
	}
	const findings = audit(dir);
	const report = formatFindings(findings, cwd);
	if (findings.length === 0) {
		process.stdout.write(report);
		return 0;
	}
	process.stderr.write(report);
	return 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { audit, extractReferences, formatFindings, listMarkdownFiles, main, resolveReference, scanCodeSpans, startsNewBlock };
