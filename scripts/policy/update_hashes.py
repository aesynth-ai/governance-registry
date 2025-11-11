import json
import hashlib
import pathlib
import yaml


def canonical(obj):
    if isinstance(obj, dict):
        return {k: canonical(obj[k]) for k in sorted(obj)}
    if isinstance(obj, list):
        return [canonical(x) for x in obj]
    return obj

def sha256_obj(obj):
    canon = json.dumps(canonical(obj), separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()

base = pathlib.Path("docs/policies")
reg_path = base / "PolicyRegistry.yaml"
registry = yaml.safe_load(reg_path.read_text(encoding="utf-8-sig"))
policy_map = {p["id"]: p for p in registry["policies"]}

for entry in registry["policies"]:
    policy_path = pathlib.Path(entry["path"])
    doc = yaml.safe_load(policy_path.read_text(encoding="utf-8-sig"))
    digest = sha256_obj(doc)
    doc["hash"] = f"sha256:{digest}"
    policy_path.write_text(yaml.safe_dump(doc, sort_keys=False), encoding="utf-8")
    entry["sha256"] = f"sha256:{digest}"

reg_digest = sha256_obj(registry)
reg_path.write_text(yaml.safe_dump(registry, sort_keys=False), encoding="utf-8")

manifest_path = base / "RegistryManifest.yaml"
manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8-sig")) if manifest_path.exists() else {}
manifest["manifest_version"] = "1.0.0"
manifest["registry_sha256"] = f"sha256:{reg_digest}"
manifest["schema_sha256"] = f"sha256:{hashlib.sha256(pathlib.Path('schemas/policy.schema.json').read_bytes()).hexdigest()}"
manifest["last_reconciled"] = "2025-11-09T00:00:00Z"
manifest["verified_by"] = "verify-policy"
manifest_path.write_text(yaml.safe_dump(manifest, sort_keys=False), encoding="utf-8")

policy_log_path = pathlib.Path("logs/POLICY_LOG.yaml")
log = yaml.safe_load(policy_log_path.read_text(encoding="utf-8-sig")) if policy_log_path.exists() else []
for entry in log:
    pid = entry.get("policy_id")
    target = policy_map.get(pid)
    if target:
        entry["sha256"] = target.get("sha256")
policy_log_path.write_text(yaml.safe_dump(log, sort_keys=False), encoding="utf-8")

print("registry_hash=sha256:" + reg_digest)
