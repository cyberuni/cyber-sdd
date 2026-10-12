# Usage: python3 -I run.py <haiku|sonnet> <N> <driver,prompt> <a,b,c,d,e>
import json, os, shutil, subprocess, sys, concurrent.futures as cf
H=os.path.dirname(os.path.abspath(__file__))
import tempfile
S=tempfile.mkdtemp(prefix="pnpm-skill-names-")  # fixtures are built fresh per run here
INSTR="When a skill is referenced by a name like `/<pkg>:<skill>` and no skill with that name exists, look for the pnpm-installed form `pnpm-<pkg>-<skill>` (for a scoped package `@scope/name`, `pnpm-@scope+name-<skill>`) and use that skill instead."
CASES={"plain":("demo-pkg","pnpm-demo-pkg-target","PELICAN-7"),
       "scoped":("@acme/kit","pnpm-@acme+kit-target","HERON-3")}
def ref(case,variant):
    pkg=CASES[case][0]
    r=f"`/{pkg}:target`"
    if variant=="d": r+=f" (installed via pnpm as `{CASES[case][1]}`)"
    return r
def build(case,variant,i,M):
    d=f"{S}/runs/{M}-{case}-{variant}-{i}"; shutil.rmtree(d,ignore_errors=True)
    pkg,dirn,mark=CASES[case]
    os.makedirs(f"{d}/.claude/skills/{dirn}",exist_ok=True); os.makedirs(f"{d}/.claude/skills/driver")
    open(f"{d}/.claude/skills/{dirn}/SKILL.md","w").write(f'---\nname: {dirn}\ndescription: "By name only"\n---\n\n# Target\n\nWrite the exact code word {mark} into result.txt in the current directory, then stop.\n')
    body=f"# Driver\n\nThis skill delegates the work. Invoke the skill {ref(case,variant)} and follow it exactly.\n"
    if variant=="b": body+=f"\n{INSTR}\n"
    open(f"{d}/.claude/skills/driver/SKILL.md","w").write(f'---\nname: driver\ndescription: "Use when asked to run the driver task"\n---\n\n{body}')
    if variant=="c": open(f"{d}/CLAUDE.md","w").write(f"# Project\n\n{INSTR}\n")
    if variant=="e": open(f"{d}/CLAUDE.md","w").write("# Project\n\nSkills installed by pnpm are named `pnpm-<pkg>-<skill>`; `/<pkg>:<skill>` means that skill (scoped `@scope/name` becomes `pnpm-@scope+name-<skill>`).\n")
    return d
def run(case,variant,i,model,mode):
    d=build(case,variant,i,model+mode)
    prompt="Run the driver task." if mode=="driver" else f"Use the skill {ref(case,variant)} and follow it exactly."
    if mode=="prompt" and variant=="b": return None
    try:
        p=subprocess.run(["claude","-p",prompt,"--setting-sources","project","--allowedTools","Skill Read Write Glob","--output-format","stream-json","--verbose","--model",model],cwd=d,capture_output=True,text=True,timeout=300)
        out=p.stdout
    except Exception as e: out=""
    calls=[];turns=0
    for l in out.splitlines():
        try: e=json.loads(l)
        except: continue
        if e.get("type")=="assistant":
            turns+=1
            for c in e["message"].get("content",[]):
                if c.get("type")=="tool_use": calls.append((c["name"],json.dumps(c["input"])))
    dirn,mark=CASES[case][1],CASES[case][2]
    res=os.path.join(d,"result.txt")
    wrote=os.path.exists(res) and mark in open(res).read()
    right=any((n=="Skill" and dirn in a) or (n=="Read" and dirn in a) for n,a in calls)
    wrong=[a for n,a in calls if n=="Skill" and dirn not in a and "driver" not in a]
    return dict(case=case,variant=variant,mode=mode,model=model,i=i,success=wrote,right=right,wrong=len(wrong),turns=turns,calls=[f"{n}:{a[:80]}" for n,a in calls])
if __name__=="__main__":
    model=sys.argv[1]; N=int(sys.argv[2]); modes=sys.argv[3].split(","); variants=sys.argv[4].split(",")
    jobs=[(c,v,i,model,m) for m in modes for c in CASES for v in variants for i in range(N)]
    with cf.ThreadPoolExecutor(8) as ex, open(f"{H}/results-{model}.jsonl","a") as f:
        for r in ex.map(lambda a:run(*a),jobs):
            if r: f.write(json.dumps(r)+"\n"); f.flush()
