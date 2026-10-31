#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/discover-plans/discover-plans.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/discover-plans/scripts/discover-plans.mjs","commands":{}};
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/discover-plans/discover-plans.mts
const TODO_STATUSES = /* @__PURE__ */ new Set([
	"pending",
	"in_progress",
	"completed"
]);
/** The default mission dispatch status — the meaning of an absent top-level `status`. */
const DEFAULT_PLAN_STATUS = "active";
function parsePlanFrontmatter(text) {
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return null;
	const fm = {
		name: "",
		status: DEFAULT_PLAN_STATUS,
		total: 0,
		completed: 0,
		inProgress: 0,
		pending: 0
	};
	let inTodos = false;
	for (const raw of m[1].split("\n")) {
		const line = raw.replace(/\r$/, "");
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		const indent = line.length - line.trimStart().length;
		const trimmed = line.trim();
		if (indent === 0) {
			inTodos = false;
			const [key, ...rest] = trimmed.split(":");
			const value = rest.join(":").trim();
			if (key === "name") fm.name = unquote(value);
			else if (key === "status") {
				const v = unquote(value);
				if (v !== "") fm.status = v;
			} else if (key === "todos") inTodos = true;
			continue;
		}
		if (inTodos) {
			const sm = /^(?:-\s+)?status:\s*(.+)$/.exec(trimmed);
			if (sm) {
				const status = unquote(sm[1].trim());
				fm.total++;
				if (status === "completed") fm.completed++;
				else if (status === "in_progress") fm.inProgress++;
				else if (status === "pending") fm.pending++;
			}
		}
	}
	return fm;
}
function unquote(v) {
	return v.replace(/^["']|["']$/g, "");
}
function nextLead(text) {
	const lines = text.split("\n");
	let i = lines.findIndex((l) => /^##\s+NEXT\b/i.test(l.trim()));
	if (i === -1) return "";
	for (i += 1; i < lines.length; i++) {
		const l = lines[i].replace(/\r$/, "").trim();
		if (l === "") continue;
		if (l.startsWith("#")) return "";
		const cleaned = l.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim();
		return cleaned.length > 200 ? `${cleaned.slice(0, 197)}...` : cleaned;
	}
	return "";
}
function discoverPlanFiles(root) {
	const dir = join(root, ".agents", "plans");
	if (!existsSync(dir)) return [];
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	return entries.filter((e) => e.isFile() && e.name.endsWith(".plan.md")).map((e) => e.name).sort();
}
function collectPlans(root) {
	const out = [];
	for (const name of discoverPlanFiles(root)) {
		let text;
		try {
			text = readFileSync(join(root, ".agents", "plans", name), "utf8");
		} catch {
			continue;
		}
		const fm = parsePlanFrontmatter(text);
		if (!fm) continue;
		out.push({
			cr: name.replace(/\.plan\.md$/, ""),
			name: fm.name,
			total: fm.total,
			completed: fm.completed,
			inProgress: fm.inProgress,
			status: fm.status,
			next: nextLead(text)
		});
	}
	return out.sort((a, b) => a.cr < b.cr ? -1 : a.cr > b.cr ? 1 : 0);
}
function filterByStatus(plans, status) {
	return plans.filter((p) => p.status === status);
}
const COLUMNS = [
	"cr",
	"name",
	"total",
	"completed",
	"inProgress",
	"status",
	"next"
];
function toonField(v) {
	if (v === "" || /[",]/.test(v) || v !== v.trim()) return `"${v.replace(/"/g, "\"\"")}"`;
	return v;
}
function toToon(plans) {
	return [`plans[${plans.length}]{${COLUMNS.join(",")}}:`, ...plans.map((p) => `  ${COLUMNS.map((c) => toonField(String(p[c]))).join(",")}`)].join("\n");
}
function main(argv) {
	const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] ?? "." : ".";
	const format = argv.includes("--format") ? argv[argv.indexOf("--format") + 1] : "toon";
	const statusFilter = argv.includes("--status") ? argv[argv.indexOf("--status") + 1] : void 0;
	let plans = collectPlans(root);
	if (statusFilter !== void 0) plans = filterByStatus(plans, statusFilter);
	const out = format === "json" ? JSON.stringify(plans, null, 2) : toToon(plans);
	process.stdout.write(`${out}\n`);
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { DEFAULT_PLAN_STATUS, TODO_STATUSES, collectPlans, filterByStatus, main, nextLead, parsePlanFrontmatter, toToon };
