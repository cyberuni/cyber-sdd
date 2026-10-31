#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/repair-private-skills/repair-private-skills.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.5.1","entry":"skills/repair-private-skills/scripts/repair-private-skills.mjs","commands":{}};
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/repair-private-skills/repair-private-skills.mts
function ensureInternalMetadata(content) {
	const lines = content.split("\n");
	if (lines[0]?.trim() !== "---") return {
		changed: false,
		content
	};
	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) if (lines[i]?.trim() === "---") {
		endIndex = i;
		break;
	}
	if (endIndex === -1) return {
		changed: false,
		content
	};
	const frontmatter = lines.slice(1, endIndex);
	let metadataIndex = -1;
	let metadataIndent = 0;
	let hasInternal = false;
	for (let i = 0; i < frontmatter.length; i++) {
		const metadataMatch = (frontmatter[i] ?? "").match(/^(\s*)metadata:\s*$/);
		if (metadataMatch) {
			metadataIndex = i;
			metadataIndent = metadataMatch[1]?.length ?? 0;
			for (let j = i + 1; j < frontmatter.length; j++) {
				const nested = frontmatter[j] ?? "";
				if (!nested.trim()) continue;
				if ((nested.match(/^(\s*)/)?.[1]?.length ?? 0) <= metadataIndent) break;
				if (/^\s*internal:\s*true\s*$/i.test(nested)) hasInternal = true;
			}
			break;
		}
	}
	if (hasInternal) return {
		changed: false,
		content
	};
	if (metadataIndex >= 0) frontmatter.splice(metadataIndex + 1, 0, `${" ".repeat(metadataIndent + 2)}internal: true`);
	else frontmatter.push("metadata:", "  internal: true");
	return {
		changed: true,
		content: [
			"---",
			...frontmatter,
			"---",
			...lines.slice(endIndex + 1)
		].join("\n")
	};
}
function resolvePublicSkillsDir(root) {
	const publicSkillsDir = join(root, "skills");
	return existsSync(publicSkillsDir) ? realpathSync(publicSkillsDir) : publicSkillsDir;
}
function isPublicSkillSymlink(skillDir, entryName, resolvedPublicSkillsDir) {
	if (!lstatSync(skillDir).isSymbolicLink()) return {
		isSymlink: false,
		inPublicTree: false
	};
	const resolved = realpathSync(skillDir);
	return {
		isSymlink: true,
		inPublicTree: resolved === join(resolvedPublicSkillsDir, entryName) || resolved.startsWith(`${resolvedPublicSkillsDir}${sep}`),
		resolved
	};
}
function validatePrivateSkills(root) {
	const privateSkillsDir = join(root, ".agents", "skills");
	const issues = [];
	if (!existsSync(privateSkillsDir)) return {
		ok: true,
		issues
	};
	const resolvedPublicSkillsDir = resolvePublicSkillsDir(root);
	for (const entry of readdirSync(privateSkillsDir, { withFileTypes: true })) {
		const skillDir = join(privateSkillsDir, entry.name);
		const symlinkCheck = isPublicSkillSymlink(skillDir, entry.name, resolvedPublicSkillsDir);
		if (symlinkCheck.isSymlink && symlinkCheck.inPublicTree) {
			issues.push({
				skill: entry.name,
				issue: "public_skill_symlink",
				details: `${skillDir} -> ${symlinkCheck.resolved}`
			});
			continue;
		}
		const skillFile = join(skillDir, "SKILL.md");
		if (!existsSync(skillFile)) {
			if (existsSync(join(skillDir, "SKILL.local.md")) || existsSync(join(skillDir, "SKILL.project.md"))) continue;
			issues.push({
				skill: entry.name,
				issue: "missing_skill_file"
			});
			continue;
		}
		const original = readFileSync(skillFile, "utf8");
		if (original.split("\n")[0]?.trim() !== "---") {
			issues.push({
				skill: entry.name,
				issue: "missing_frontmatter"
			});
			continue;
		}
		if (ensureInternalMetadata(original).changed) issues.push({
			skill: entry.name,
			issue: "missing_metadata_internal"
		});
	}
	return {
		ok: issues.length === 0,
		issues
	};
}
function repairPrivateSkills(root) {
	const privateSkillsDir = join(root, ".agents", "skills");
	const actions = [];
	let changed = false;
	if (!existsSync(privateSkillsDir)) return {
		changed: false,
		actions
	};
	const resolvedPublicSkillsDir = resolvePublicSkillsDir(root);
	for (const entry of readdirSync(privateSkillsDir, { withFileTypes: true })) {
		const skillDir = join(privateSkillsDir, entry.name);
		const symlinkCheck = isPublicSkillSymlink(skillDir, entry.name, resolvedPublicSkillsDir);
		if (symlinkCheck.isSymlink && symlinkCheck.inPublicTree) {
			unlinkSync(skillDir);
			actions.push({
				skill: entry.name,
				action: "removed_public_symlink",
				details: `${skillDir} -> ${symlinkCheck.resolved}`
			});
			changed = true;
			continue;
		}
		const skillFile = join(skillDir, "SKILL.md");
		if (!existsSync(skillFile)) {
			if (existsSync(join(skillDir, "SKILL.local.md")) || existsSync(join(skillDir, "SKILL.project.md"))) {
				actions.push({
					skill: entry.name,
					action: "local_augmentation_only"
				});
				continue;
			}
			actions.push({
				skill: entry.name,
				action: "skipped_missing_skill"
			});
			continue;
		}
		const original = readFileSync(skillFile, "utf8");
		if (original.split("\n")[0]?.trim() !== "---") {
			actions.push({
				skill: entry.name,
				action: "skipped_no_frontmatter"
			});
			continue;
		}
		const updated = ensureInternalMetadata(original);
		if (updated.changed) {
			writeFileSync(skillFile, updated.content);
			actions.push({
				skill: entry.name,
				action: "updated_metadata"
			});
			changed = true;
		} else actions.push({
			skill: entry.name,
			action: "already_internal"
		});
	}
	return {
		changed,
		actions
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function main(argv) {
	const root = flag(argv, "--root") ?? ".";
	const json = flag(argv, "--format") === "json";
	const w = (s) => process.stdout.write(`${s}\n`);
	if (argv.includes("validate")) {
		const result = validatePrivateSkills(root);
		if (json) w(JSON.stringify(result));
		else if (result.ok) w("ok: no issues found");
		else for (const issue of result.issues) w(`${issue.skill}: ${issue.issue}${issue.details ? ` (${issue.details})` : ""}`);
		return result.ok ? 0 : 1;
	}
	if (argv.includes("repair")) {
		const result = repairPrivateSkills(root);
		if (json) w(JSON.stringify(result));
		else if (!result.changed) w("no changes needed");
		else for (const action of result.actions) w(`${action.skill}: ${action.action}${action.details ? ` (${action.details})` : ""}`);
		return 0;
	}
	w("usage: repair-private-skills.mjs [--root .] <validate|repair> [--format json]");
	return 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { ensureInternalMetadata, main, repairPrivateSkills, validatePrivateSkills };
