// Execute only in an isolated candidate: no production volumes or environment.
// Uses Grist's native data engine and the upstream Sandbox.ts regression shapes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {createConcreteSandbox} = require('app/server/lib/NSandbox');
assert.equal(process.env.GRIST_PYODIDE_SKIP_DENO, '0');
assert.equal(process.env.GRIST_SANDBOX_FLAVOR, 'pyodide');
const checks = [];
const mainPath = '/grist/sandbox/grist/main.py';
const mainHash = () => crypto.createHash('sha256').update(fs.readFileSync(mainPath)).digest('hex');
const before = mainHash();
fs.writeFileSync('/tmp/fictional-host-secret', 'fictional host sentinel');
fs.mkdirSync('/tmp/import-fixture', {recursive:true});
fs.writeFileSync('/tmp/import-fixture/example.csv', 'Item,Quantity\nBooks,3\nPens,7\n');
const sandbox = createConcreteSandbox('pyodide', {preferredPythonVersion:'3', importMount:'/tmp/import-fixture'});
const timer = setTimeout(() => {console.error('Native sandbox check exceeded 120s'); process.exit(1)}, 120000);
async function formula(text) {
  await sandbox.pyCall('apply_user_actions', [['ModifyColumn', 'Sample', 'Result', {formula:text}]]);
  const result = await sandbox.pyCall('fetch_table', 'Sample');
  return result[3].Result[0];
}
async function denied(text) {
  let result;
  try {
    result = await formula(text);
  } catch (error) {
    assert.match(String(error), /NotCapable|Permission|FileNotFound|OSError|not supported|not found|not defined|AttributeError/);
    return;
  }
  assert.ok(Array.isArray(result) && result[0] === 'E', `Escape returned a non-error result (${text.split('\n')[0]}): ${JSON.stringify(result)}`);
}
(async () => {
  try {
    assert.equal(await sandbox.pyCall('test_echo', 'Hola — fictional'), 'Hola — fictional');
    assert.equal(sandbox.getFlavor(), 'pyodide');
    assert.equal(sandbox.childProc.spawnfile, '/usr/local/bin/grist-deno');
    const childEnv=fs.readFileSync(`/proc/${sandbox.childProc.pid}/environ`,'utf8').split('\0');
    assert.ok(childEnv.includes('DENO_NO_UPDATE_CHECK=1'));
    assert.ok(childEnv.includes('DENO_NO_PROMPT=1'));
    assert.ok(!sandbox.childProc.spawnargs.some(a=>/^--allow-(run|net|ffi)(=|$)/.test(a)));
    checks.push('native Deno sandbox echo and no network/run/FFI grants');
    await sandbox.pyCall('load_empty');
    await sandbox.pyCall('apply_user_actions', [
      ['AddTable', 'Sample', [{id:'Amount', type:'Numeric'}, {id:'Result', type:'Any', isFormula:true, formula:'$Amount * 3'}]],
      ['AddRecord', 'Sample', 1, {Amount:7}],
    ]);
    assert.equal((await sandbox.pyCall('fetch_table','Sample'))[3].Result[0], 21);
    assert.equal(await formula('sum([1, 2, 3])'), 6);
    assert.equal(await formula('"mañana".upper()'), 'MAÑANA');
    assert.equal(await formula('import datetime\nreturn datetime.date(2026, 10, 11).isoformat()'), '2026-10-11');
    checks.push('numeric, Unicode and date formulas');
    await assert.rejects(sandbox.pyCall('test_read_file', '/tmp/fictional-host-secret'), /FileNotFound|Permission/);
    await sandbox.pyCall('test_write_file', '/tmp/fictional-sandbox-only', 'fictional');
    assert.equal(await sandbox.pyCall('test_read_file','/tmp/fictional-sandbox-only'), 'fictional');
    assert.ok(!fs.existsSync('/tmp/fictional-sandbox-only'));
    assert.equal(await sandbox.pyCall('test_read_file','/import/example.csv'), 'Item,Quantity\nBooks,3\nPens,7\n');
    await denied('open("/tmp/fictional-host-secret").read()');
    await denied('import subprocess\nreturn subprocess.check_output(["/bin/sh", "-c", "echo forbidden"]).decode()');
    // Emscripten can return a lazy socket object without making a connection.
    // Exercise actual I/O instead of mistaking object construction for egress.
    await denied('import urllib.request\nreturn urllib.request.urlopen("http://127.0.0.1:9/", timeout=1).read().decode()');
    await denied('import js\nreturn js.Deno.readTextFileSync("/tmp/fictional-host-secret")');
    checks.push('host filesystem, subprocess, network and direct JS access denied');
    await formula('import os\nreturn os.system("echo forbidden > /tmp/fictional-process-write")');
    assert.ok(!fs.existsSync('/tmp/fictional-process-write'));
    await sandbox.pyCall('test_write_file', '/grist/main.py', '\n# fictional sandbox edit\n');
    assert.equal(mainHash(), before);
    assert.equal(await formula('$Amount * 5'), 35);
    checks.push('os.system denied, read-only source separation, engine usable after ordinary rejected operations');
    // Regression for the exact upstream Pyodide escape class (CVE-2026-24002).
    // This fatal Emscripten path may close the sandbox's RPC channel; run last.
    await denied('from ctypes import cdll, c_char_p\nlibc = cdll.LoadLibrary(None)\nlibc.emscripten_run_script_string.argtypes = [c_char_p]\nlibc.emscripten_run_script_string.restype = c_char_p\nreturn libc.emscripten_run_script_string(b"require(\'fs\').writeFileSync(\'/tmp/fictional-emscripten-write\', \'forbidden\')")');
    assert.ok(!fs.existsSync('/tmp/fictional-emscripten-write'));
    checks.push('upstream emscripten host-write escape denied; fatal probe may close sandbox');
    console.log(JSON.stringify({passed:true,checks}));
  } finally {clearTimeout(timer);await sandbox.shutdown();}
})().catch(e=>{console.error(String(e));process.exitCode=1});
