#!/usr/bin/env python3
"""Provision only Utilibre monitors in an existing Uptime Kuma 2.5 instance.

Uptime Kuma 2 has no native JSON monitor import. This one-shot adapter uses
its local Socket.IO interface, as the existing Utilibre Kuma scripts do.
Credentials travel only through subprocess stdin and are never stored here.
"""
import argparse
import base64
import getpass
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


def validate_manifest(data):
    if data.get("schemaVersion") != 1 or not isinstance(data.get("targets"), list):
        raise ValueError("Expected external Kuma manifest version 1")
    if not 1 <= len(data["targets"]) <= 200:
        raise ValueError("Target count is outside the reviewed limit")
    ids = set()
    endpoints = set()
    for target in data["targets"]:
        if not isinstance(target, dict) or not re.fullmatch(r"[a-z0-9-]+", target.get("id", "")):
            raise ValueError("Invalid monitor ID")
        if target["id"] in ids:
            raise ValueError("Duplicate monitor ID")
        ids.add(target["id"])
        if not isinstance(target.get("name"), str) or not 1 <= len(target["name"]) <= 100:
            raise ValueError("Invalid monitor name")
        if target.get("group") not in {"Core", "Documents", "Creative", "Sharing", "Reading", "Data", "Other"}:
            raise ValueError("Invalid monitor group")
        if not isinstance(target.get("interval"), int) or not 120 <= target["interval"] <= 3600:
            raise ValueError("Invalid monitor interval")
        if target.get("type") == "http":
            parsed = urlsplit(target.get("url", ""))
            if (parsed.scheme != "https" or parsed.username or parsed.password or parsed.port or
                    parsed.query or parsed.fragment or not parsed.hostname or
                    not (parsed.hostname == "utilibre.org" or parsed.hostname.endswith(".utilibre.org"))):
                raise ValueError("Only credential-free Utilibre HTTPS targets are allowed")
            endpoint = ("http", target["url"])
        elif target.get("type") == "port":
            if target.get("hostname") != "mumble.utilibre.org" or target.get("port") != 64738:
                raise ValueError("Only the reviewed Mumble TCP port is allowed")
            endpoint = ("port", target["hostname"], target["port"])
        else:
            raise ValueError("Unsupported monitor type")
        if endpoint in endpoints:
            raise ValueError("Duplicate monitor endpoint")
        endpoints.add(endpoint)
    return data


PROGRAM = r"""
const { io } = require('socket.io-client');
const manifest = JSON.parse(Buffer.from('__MANIFEST__', 'base64').toString('utf8'));
const credentials = JSON.parse(Buffer.from('__CREDENTIALS__', 'base64').toString('utf8'));
const mode = __MODE__;
const version = require('./package.json').version;
if (!/^2\.5\./.test(version)) throw Error('Reviewed only for Uptime Kuma 2.5.x; found ' + version);
const port = process.env.UPTIME_KUMA_PORT || '3001';
const base = 'http://127.0.0.1:' + port;
const socket = io(base, { transports: ['websocket'], reconnection: false });
const deadline = setTimeout(() => { console.error('Kuma operation timed out'); process.exit(1); }, 600000);
const call = (name, ...args) => new Promise((resolve, reject) =>
  socket.timeout(60000).emit(name, ...args, (error, result) =>
    error ? reject(Error(name + ' timed out')) :
    result?.ok === false ? reject(Error(name + ': ' + result.msg)) : resolve(result)));
const monitorKey = target => target.type === 'http'
  ? 'http:' + target.url : 'port:' + target.hostname + ':' + target.port;
const currentKey = monitor => monitor.type === 'http'
  ? 'http:' + monitor.url : 'port:' + monitor.hostname + ':' + monitor.port;

socket.on('connect_error', error => { console.error('Cannot connect to local Kuma socket:', error.message); process.exit(1); });
socket.on('connect', async () => {
  try {
    await call('login', credentials);
    const existing = await Promise.race([
      new Promise(resolve => {
        socket.once('monitorList', resolve);
        socket.emit('getMonitorList');
      }),
      new Promise((_, reject) => setTimeout(() => reject(Error('Monitor list timed out')), 20000)),
    ]);
    const byEndpoint = new Map(Object.values(existing || {}).map(m => [currentKey(m), m]));
    const byName = new Map(Object.values(existing || {}).map(m => [m.name, m]));
    let added = 0, reused = 0, paused = 0;
    const ids = new Map();
    for (const target of manifest.targets) {
      const key = monitorKey(target);
      const name = 'Utilibre · ' + target.name;
      const prior = byEndpoint.get(key);
      if (byName.has(name) && byName.get(name) !== prior) {
        throw Error('Monitor name already points elsewhere: ' + name);
      }
      if (prior) {
        reused++;
        if (!prior.active) paused++;
        ids.set(target.id, prior.id);
        continue;
      }
      if (mode === 'check') continue;
      const settings = {
        name, type: target.type, interval: target.interval,
        retryInterval: 60, resendInterval: 0, maxretries: 2, timeout: 20,
        active: true, upsideDown: false, notificationIDList: {}, conditions: [],
        // Kuma 2.5 validates this field for every monitor type, including TCP.
        accepted_statuscodes: ['200-299'],
      };
      if (target.type === 'http') Object.assign(settings, {
        url: target.url, method: 'GET',
        maxredirects: 5, ignoreTls: false, cacheBust: false,
      });
      else Object.assign(settings, { hostname: target.hostname, port: target.port });
      const result = await call('add', settings);
      if (!Number.isInteger(result.monitorID)) throw Error('Kuma did not return a monitor ID');
      ids.set(target.id, result.monitorID);
      byEndpoint.set(key, { ...settings, id: result.monitorID });
      added++;
    }
    if (mode === 'apply') {
      let createdPage = false;
      let pageSettings;
      try {
        pageSettings = await call('getStatusPage', 'utilibre');
      } catch (error) {
        if (error.message !== 'getStatusPage: No slug?') throw error;
        await call('addStatusPage', 'Utilibre', 'utilibre');
        createdPage = true;
        pageSettings = await call('getStatusPage', 'utilibre');
      }
      let groups = [];
      if (!createdPage) {
        // Kuma caches this API for five minutes, including a prior 404.
        const pageResponse = await fetch(base + '/api/status-page/utilibre?import=' + Date.now());
        if (!pageResponse.ok) throw Error('Cannot load Utilibre status page: HTTP ' + pageResponse.status);
        const publicPage = await pageResponse.json();
        if (!Array.isArray(publicPage.publicGroupList)) throw Error('Invalid Utilibre status page groups');
        groups = publicPage.publicGroupList;
      }
      const config = pageSettings.config;
      if (!config) throw Error('Cannot read status page settings');
      for (const target of manifest.targets) {
        let group = groups.find(g => g.name === target.group);
        if (!group) { group = { name: target.group, monitorList: [] }; groups.push(group); }
        const id = ids.get(target.id);
        if (!groups.some(g => g.monitorList?.some(m => m.id === id))) {
          group.monitorList.push({ id, sendUrl: false });
        }
      }
      if (createdPage) config.description =
        'External checks from a separate VM. HTTPS/TCP reachability does not test complete tasks or private content.';
      config.analyticsType = null;
      config.analyticsId = '';
      config.analyticsScriptUrl = '';
      await call('saveStatusPage', 'utilibre', config, config.icon || '', groups);
    }
    console.log(JSON.stringify({ version, targets: manifest.targets.length, added, reused,
      missing: manifest.targets.length - added - reused, paused, statusPage: mode === 'apply' ? 'utilibre' : 'unchanged' }));
    clearTimeout(deadline);
    socket.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    socket.disconnect();
    process.exit(1);
  }
});
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "targets.json")
    parser.add_argument("--container", help="Uptime Kuma Docker container name")
    parser.add_argument("--app-dir", type=Path, help="Uptime Kuma application directory for a non-Docker install")
    parser.add_argument("--credentials-file", type=Path, help="Mode-0600 JSON with username/password")
    parser.add_argument("--check", action="store_true", help="Read-only comparison with the running instance")
    parser.add_argument("--apply", action="store_true", help="Add missing monitors and publish the Utilibre page")
    args = parser.parse_args()
    manifest = validate_manifest(json.loads(args.manifest.read_text()))
    if args.check and args.apply or args.container and args.app_dir:
        parser.error("Select one mode and one execution target")
    if not args.check and not args.apply:
        print(json.dumps({"targets": len(manifest["targets"]),
                          "enabledServiceIds": manifest.get("enabledServiceCount"),
                          "http": sum(t["type"] == "http" for t in manifest["targets"]),
                          "tcp": sum(t["type"] == "port" for t in manifest["targets"])}))
        return
    if not args.container and not args.app_dir:
        parser.error("Specify --container or --app-dir")
    if args.container and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", args.container):
        parser.error("Invalid Docker container name")
    if args.credentials_file:
        if args.credentials_file.stat().st_mode & 0o077:
            parser.error("Credentials file must be accessible only to its owner (mode 0600)")
        credentials = json.loads(args.credentials_file.read_text())
    else:
        credentials = {"username": input("Kuma admin username: "),
                       "password": getpass.getpass("Kuma admin password: ")}
    if not credentials.get("username") or not credentials.get("password"):
        parser.error("Missing Kuma admin credentials")
    encoded_manifest = base64.b64encode(json.dumps(manifest).encode()).decode()
    encoded_credentials = base64.b64encode(json.dumps(credentials).encode()).decode()
    program = (PROGRAM.replace("__MANIFEST__", encoded_manifest)
               .replace("__CREDENTIALS__", encoded_credentials)
               .replace("__MODE__", json.dumps("apply" if args.apply else "check")))
    command = ["docker", "exec", "-i", args.container, "node", "-"] if args.container else ["node", "-"]
    result = subprocess.run(command, input=program, text=True, cwd=args.app_dir,
                            capture_output=True, timeout=660, check=False)
    if result.stdout:
        print(result.stdout.rstrip())
    if result.stderr:
        print(result.stderr.rstrip(), file=__import__("sys").stderr)
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
