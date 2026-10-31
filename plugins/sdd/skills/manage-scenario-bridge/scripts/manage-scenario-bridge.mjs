#!/usr/bin/env node
// Compiled by `universal-plugin plugin build` from src/manage-scenario-bridge/manage-scenario-bridge.mts. Edit the source, not this file.
globalThis.__SKILL_SCRIPT__ = {"package":null,"bin":null,"version":"0.7.2","entry":"skills/manage-scenario-bridge/scripts/manage-scenario-bridge.mjs","commands":{}};
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
//#region src/vendor/gherkin-cli.mjs
var TokenType;
(function(TokenType) {
	TokenType[TokenType["None"] = 0] = "None";
	TokenType[TokenType["EOF"] = 1] = "EOF";
	TokenType[TokenType["Empty"] = 2] = "Empty";
	TokenType[TokenType["Comment"] = 3] = "Comment";
	TokenType[TokenType["TagLine"] = 4] = "TagLine";
	TokenType[TokenType["FeatureLine"] = 5] = "FeatureLine";
	TokenType[TokenType["RuleLine"] = 6] = "RuleLine";
	TokenType[TokenType["BackgroundLine"] = 7] = "BackgroundLine";
	TokenType[TokenType["ScenarioLine"] = 8] = "ScenarioLine";
	TokenType[TokenType["ExamplesLine"] = 9] = "ExamplesLine";
	TokenType[TokenType["StepLine"] = 10] = "StepLine";
	TokenType[TokenType["DocStringSeparator"] = 11] = "DocStringSeparator";
	TokenType[TokenType["TableRow"] = 12] = "TableRow";
	TokenType[TokenType["Language"] = 13] = "Language";
	TokenType[TokenType["Other"] = 14] = "Other";
})(TokenType || (TokenType = {}));
var RuleType;
(function(RuleType) {
	RuleType[RuleType["None"] = 0] = "None";
	RuleType[RuleType["_EOF"] = 1] = "_EOF";
	RuleType[RuleType["_Empty"] = 2] = "_Empty";
	RuleType[RuleType["_Comment"] = 3] = "_Comment";
	RuleType[RuleType["_TagLine"] = 4] = "_TagLine";
	RuleType[RuleType["_FeatureLine"] = 5] = "_FeatureLine";
	RuleType[RuleType["_RuleLine"] = 6] = "_RuleLine";
	RuleType[RuleType["_BackgroundLine"] = 7] = "_BackgroundLine";
	RuleType[RuleType["_ScenarioLine"] = 8] = "_ScenarioLine";
	RuleType[RuleType["_ExamplesLine"] = 9] = "_ExamplesLine";
	RuleType[RuleType["_StepLine"] = 10] = "_StepLine";
	RuleType[RuleType["_DocStringSeparator"] = 11] = "_DocStringSeparator";
	RuleType[RuleType["_TableRow"] = 12] = "_TableRow";
	RuleType[RuleType["_Language"] = 13] = "_Language";
	RuleType[RuleType["_Other"] = 14] = "_Other";
	RuleType[RuleType["GherkinDocument"] = 15] = "GherkinDocument";
	RuleType[RuleType["Feature"] = 16] = "Feature";
	RuleType[RuleType["FeatureHeader"] = 17] = "FeatureHeader";
	RuleType[RuleType["Rule"] = 18] = "Rule";
	RuleType[RuleType["RuleHeader"] = 19] = "RuleHeader";
	RuleType[RuleType["Background"] = 20] = "Background";
	RuleType[RuleType["ScenarioDefinition"] = 21] = "ScenarioDefinition";
	RuleType[RuleType["Scenario"] = 22] = "Scenario";
	RuleType[RuleType["ExamplesDefinition"] = 23] = "ExamplesDefinition";
	RuleType[RuleType["Examples"] = 24] = "Examples";
	RuleType[RuleType["ExamplesTable"] = 25] = "ExamplesTable";
	RuleType[RuleType["Step"] = 26] = "Step";
	RuleType[RuleType["StepArg"] = 27] = "StepArg";
	RuleType[RuleType["DataTable"] = 28] = "DataTable";
	RuleType[RuleType["DocString"] = 29] = "DocString";
	RuleType[RuleType["Tags"] = 30] = "Tags";
	RuleType[RuleType["DescriptionHelper"] = 31] = "DescriptionHelper";
	RuleType[RuleType["Description"] = 32] = "Description";
})(RuleType || (RuleType = {}));
var AttachmentContentEncoding;
(function(AttachmentContentEncoding) {
	AttachmentContentEncoding["IDENTITY"] = "IDENTITY";
	AttachmentContentEncoding["BASE64"] = "BASE64";
})(AttachmentContentEncoding || (AttachmentContentEncoding = {}));
var HookType;
(function(HookType) {
	HookType["BEFORE_TEST_RUN"] = "BEFORE_TEST_RUN";
	HookType["AFTER_TEST_RUN"] = "AFTER_TEST_RUN";
	HookType["BEFORE_TEST_CASE"] = "BEFORE_TEST_CASE";
	HookType["AFTER_TEST_CASE"] = "AFTER_TEST_CASE";
	HookType["BEFORE_TEST_STEP"] = "BEFORE_TEST_STEP";
	HookType["AFTER_TEST_STEP"] = "AFTER_TEST_STEP";
})(HookType || (HookType = {}));
var PickleStepType;
(function(PickleStepType) {
	PickleStepType["UNKNOWN"] = "Unknown";
	PickleStepType["CONTEXT"] = "Context";
	PickleStepType["ACTION"] = "Action";
	PickleStepType["OUTCOME"] = "Outcome";
})(PickleStepType || (PickleStepType = {}));
var SourceMediaType;
(function(SourceMediaType) {
	SourceMediaType["TEXT_X_CUCUMBER_GHERKIN_PLAIN"] = "text/x.cucumber.gherkin+plain";
	SourceMediaType["TEXT_X_CUCUMBER_GHERKIN_MARKDOWN"] = "text/x.cucumber.gherkin+markdown";
})(SourceMediaType || (SourceMediaType = {}));
var StepDefinitionPatternType;
(function(StepDefinitionPatternType) {
	StepDefinitionPatternType["CUCUMBER_EXPRESSION"] = "CUCUMBER_EXPRESSION";
	StepDefinitionPatternType["REGULAR_EXPRESSION"] = "REGULAR_EXPRESSION";
})(StepDefinitionPatternType || (StepDefinitionPatternType = {}));
var StepKeywordType;
(function(StepKeywordType) {
	StepKeywordType["UNKNOWN"] = "Unknown";
	StepKeywordType["CONTEXT"] = "Context";
	StepKeywordType["ACTION"] = "Action";
	StepKeywordType["OUTCOME"] = "Outcome";
	StepKeywordType["CONJUNCTION"] = "Conjunction";
})(StepKeywordType || (StepKeywordType = {}));
var TestStepResultStatus;
(function(TestStepResultStatus) {
	TestStepResultStatus["UNKNOWN"] = "UNKNOWN";
	TestStepResultStatus["PASSED"] = "PASSED";
	TestStepResultStatus["SKIPPED"] = "SKIPPED";
	TestStepResultStatus["PENDING"] = "PENDING";
	TestStepResultStatus["UNDEFINED"] = "UNDEFINED";
	TestStepResultStatus["AMBIGUOUS"] = "AMBIGUOUS";
	TestStepResultStatus["FAILED"] = "FAILED";
})(TestStepResultStatus || (TestStepResultStatus = {}));
var KeywordPrefix;
(function(KeywordPrefix) {
	KeywordPrefix["BULLET"] = "^(\\s*[*+-]\\s*)";
	KeywordPrefix["HEADER"] = "^(#{1,6}\\s)";
})(KeywordPrefix || (KeywordPrefix = {}));
StepKeywordType.UNKNOWN, PickleStepType.UNKNOWN, StepKeywordType.CONTEXT, PickleStepType.CONTEXT, StepKeywordType.ACTION, PickleStepType.ACTION, StepKeywordType.OUTCOME, PickleStepType.OUTCOME, StepKeywordType.CONJUNCTION;
//#endregion
//#region src/verify-scenarios/verify-scenarios.mts
function parseSourcesToml(text) {
	const out = [];
	const blocks = text.split(/(?=^\s*\[\[source\]\]\s*$)/m).filter((b) => /^\s*\[\[source\]\]\s*$/m.test(b));
	for (const block of blocks) {
		const body = block.replace(/^\s*\[\[source\]\]\s*$/m, "");
		const fields = {};
		for (const m of body.matchAll(/^\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*$/gm)) fields[m[1]] = m[2] ?? m[3] ?? "";
		if (!fields.adapter || !fields.reportPath) continue;
		out.push({
			adapter: fields.adapter,
			command: fields.command,
			reportPath: fields.reportPath
		});
	}
	return out;
}
if (process.argv[1] && false);
//#endregion
//#region src/manage-scenario-bridge/manage-scenario-bridge.mts
const CONFIG_REL_PATH = ".agents/sdd/scenario-bridge.toml";
function configPath(projectPath) {
	return join(projectPath, CONFIG_REL_PATH);
}
function listSources(projectPath) {
	const file = configPath(projectPath);
	if (!existsSync(file)) return [];
	try {
		return parseSourcesToml(readFileSync(file, "utf8"));
	} catch {
		return [];
	}
}
function renderBlock(source) {
	return [
		"[[source]]",
		`adapter    = "${source.adapter}"`,
		...source.command !== void 0 ? [`command    = "${source.command}"`] : [],
		`reportPath = "${source.reportPath}"`
	].join("\n");
}
function validateInput(input) {
	if (!input.adapter || !input.reportPath) return {
		ok: false,
		reason: "a source needs both adapter and reportPath"
	};
	return {
		ok: true,
		adapter: input.adapter,
		command: input.command,
		reportPath: input.reportPath
	};
}
function scaffoldSource(projectPath, input) {
	const valid = validateInput(input);
	if (!valid.ok) return valid;
	const file = configPath(projectPath);
	if (existsSync(file)) return {
		ok: false,
		reason: "scenario-bridge.toml already exists; use add to append a source"
	};
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${renderBlock(valid)}\n`);
	const sources = listSources(projectPath);
	return {
		ok: true,
		message: `scaffolded ${file}`,
		sources
	};
}
function addSource(projectPath, input) {
	const valid = validateInput(input);
	if (!valid.ok) return valid;
	const file = configPath(projectPath);
	if (!existsSync(file)) return {
		ok: false,
		reason: "scenario-bridge.toml does not exist yet; use scaffold to create it first"
	};
	const existing = readFileSync(file, "utf8");
	const sep = existing.endsWith("\n") ? "" : "\n";
	writeFileSync(file, `${existing}${sep}\n${renderBlock(valid)}\n`);
	const sources = listSources(projectPath);
	return {
		ok: true,
		message: `added a source to ${file}`,
		sources
	};
}
function flag(argv, name) {
	const i = argv.indexOf(name);
	return i === -1 ? void 0 : argv[i + 1];
}
function inputFromArgv(argv) {
	return {
		adapter: flag(argv, "--adapter"),
		command: flag(argv, "--command"),
		reportPath: flag(argv, "--report-path")
	};
}
function main(argv) {
	const projectPath = flag(argv, "--project-path") ?? ".";
	const w = (s) => process.stdout.write(`${s}\n`);
	if (argv.includes("--list")) {
		for (const s of listSources(projectPath)) w(`${s.adapter}${s.command ? ` (${s.command})` : ""} -> ${s.reportPath}`);
		return 0;
	}
	if (argv.includes("--scaffold")) {
		const r = scaffoldSource(projectPath, inputFromArgv(argv));
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	if (argv.includes("--add")) {
		const r = addSource(projectPath, inputFromArgv(argv));
		w(r.ok ? r.message : `refused: ${r.reason}`);
		return r.ok ? 0 : 1;
	}
	w("usage: manage-scenario-bridge --project-path <dir> --list | --scaffold --adapter <a> [--command <c>] --report-path <p> | --add --adapter <a> [--command <c>] --report-path <p>");
	return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(main(process.argv.slice(2)));
//#endregion
export { addSource, configPath, listSources, main, scaffoldSource };
