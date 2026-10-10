#!/usr/bin/env python3
"""Small, asserted changes against upstream 54e4a938; never edit live state."""
from pathlib import Path
import sys
root=Path(sys.argv[1])
def replace(path, old, new):
    p=root/path;s=p.read_text();assert old in s,(path,old[:80]);p.write_text(s.replace(old,new))
replace('src/Sidebar.tsx','`${window.location.origin}/#${documentId}`','`${window.location.origin}${window.location.pathname}#${documentId}`')
replace('src/useHash.ts','const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";\nconst idLen = 6;','const idLen = 16; // 128 bits of browser-generated capability-link entropy.')
replace('src/useHash.ts','''  if (!window.location.hash) {
    let id = "";
    for (let i = 0; i < idLen; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }''','''  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(window.location.hash.slice(1))) {
    const bytes = crypto.getRandomValues(new Uint8Array(idLen));
    const id = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");''')
replace('src/index.tsx','import { StrictMode } from "react";','''import { StrictMode } from "react";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "json") return new JsonWorker();
    if (["css", "scss", "less"].includes(label)) return new CssWorker();
    if (["html", "handlebars", "razor"].includes(label)) return new HtmlWorker();
    if (["typescript", "javascript"].includes(label)) return new TsWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });''')
replace('src/Footer.tsx','import { Flex, Icon, Text }','import { Flex, Icon, Text, Link }')
replace('src/Footer.tsx','''      </Flex>
    </Flex>''','''      </Flex>
      <Flex align="center" gap={3} px={2} fontSize="xs">
        <Link href="https://utilibre.org/en/">More tools</Link>
        <Link href="https://utilibre.org/es/">Más herramientas</Link>
        <Link href="https://utilibre.org/en/guides/shared-code-pad">Data notes</Link>
        <Link href="https://utilibre.org/es/guias/editor-codigo-compartido">Datos</Link>
      </Flex>
    </Flex>''')
replace('src/App.tsx','''        Rustpad
      </Box>''','''        Rustpad · Save a copy: shared text is server-readable and temporary.
        {" "}Guardá una copia: el servidor puede leer el texto compartido y lo conserva temporalmente.
      </Box>''')
# Native resource boundaries: no replacement collaboration protocol or storage.
replace('rustpad-server/src/lib.rs','use tokio::time::{self, Instant};','use tokio::time::{self, Instant};\nuse tokio::sync::{Semaphore, OwnedSemaphorePermit};')
replace('rustpad-server/src/lib.rs','struct Document {','struct Document {\n    _slot: OwnedSemaphorePermit,')
replace('rustpad-server/src/lib.rs','fn new(rustpad: Arc<Rustpad>) -> Self {\n        Self {','fn new(rustpad: Arc<Rustpad>, slot: OwnedSemaphorePermit) -> Self {\n        Self {\n            _slot: slot,')
replace('rustpad-server/src/lib.rs','struct ServerState {','struct ServerState {\n    document_slots: Arc<Semaphore>,\n    connection_slots: Arc<Semaphore>,')
replace('rustpad-server/src/lib.rs','''    let state = ServerState {
        documents: Default::default(),''','''    let state = ServerState {
        document_slots: Arc::new(Semaphore::new(64)),
        connection_slots: Arc::new(Semaphore::new(128)),
        documents: Default::default(),''')
replace('rustpad-server/src/lib.rs','''    use dashmap::mapref::entry::Entry;

    let mut entry''','''    use dashmap::mapref::entry::Entry;
    if id.is_empty() || id.len() > 64 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-') {
        return Err(warp::reject::not_found());
    }
    let connection_slot = state.connection_slots.clone().try_acquire_owned()
        .map_err(|_| warp::reject::custom(CustomReject(anyhow::anyhow!("connection limit"))))?;

    let mut entry''')
replace('rustpad-server/src/lib.rs','''        Entry::Vacant(e) => {
            let rustpad''','''        Entry::Vacant(e) => {
            let document_slot = state.document_slots.clone().try_acquire_owned()
                .map_err(|_| warp::reject::custom(CustomReject(anyhow::anyhow!("document limit"))))?;
            let rustpad''')
replace('rustpad-server/src/lib.rs','e.insert(Document::new(rustpad))','e.insert(Document::new(rustpad, document_slot))')
replace('rustpad-server/src/lib.rs','Ok(ws.on_upgrade(|socket| async move { rustpad.on_connection(socket).await }))','''Ok(ws.max_message_size(1024 * 1024).max_frame_size(1024 * 1024).on_upgrade(|socket| async move {
        let _connection_slot = connection_slot;
        rustpad.on_connection(socket).await;
    }))''')
replace('rustpad-server/src/rustpad.rs','struct State {','struct State {\n    history_bytes: usize,')
replace('rustpad-server/src/rustpad.rs','''        loop {
            // In order''','''        let mut rate_window = tokio::time::Instant::now();
        let mut received = 0;
        loop {
            // In order''')
replace('rustpad-server/src/rustpad.rs','''                        Some(message) => {
                            self.handle_message''','''                        Some(message) => {
                            if rate_window.elapsed() >= std::time::Duration::from_secs(1) {
                                rate_window = tokio::time::Instant::now();
                                received = 0;
                            }
                            received += 1;
                            if received > 100 { bail!("message rate limit"); }
                            self.handle_message''')
replace('rustpad-server/src/rustpad.rs','''            ClientMsg::SetLanguage(language) => {
                self.state''','''            ClientMsg::SetLanguage(language) => {
                if language.len() > 64 { bail!("language metadata limit"); }
                self.state''')
replace('rustpad-server/src/rustpad.rs','''            ClientMsg::ClientInfo(info) => {
                self.state''','''            ClientMsg::ClientInfo(info) => {
                if info.name.len() > 128 { bail!("name metadata limit"); }
                self.state''')
replace('rustpad-server/src/rustpad.rs','''            ClientMsg::CursorData(data) => {
                self.state''','''            ClientMsg::CursorData(data) => {
                if data.cursors.len() > 64 || data.selections.len() > 64 { bail!("cursor metadata limit"); }
                self.state''')
replace('rustpad-server/src/rustpad.rs','''        let len = state.operations.len();
        if revision''','''        let len = state.operations.len();
        if len >= 4096 { bail!("history operation limit; copy text to a new pad"); }
        if revision''')
replace('rustpad-server/src/rustpad.rs','''        let new_text = operation.apply(&state.text)?;
        let mut state''','''        let operation_bytes = serde_json::to_vec(&operation)?.len();
        if state.history_bytes + operation_bytes > 1024 * 1024 { bail!("history byte limit; copy text to a new pad"); }
        let new_text = operation.apply(&state.text)?;
        if new_text.len() > 256 * 1024 { bail!("UTF-8 document byte limit"); }
        let mut state''')
replace('rustpad-server/src/rustpad.rs','''        state.operations.push(UserOperation { id, operation });''','''        state.history_bytes += operation_bytes;
        state.operations.push(UserOperation { id, operation });''')
# Current compatible dependencies; the resulting lockfile is published separately.
replace('rustpad-server/Cargo.toml','dashmap = "4.0.2"','dashmap = "6.2.1"')
replace('rustpad-server/Cargo.toml','dotenv = "0.15.0"','dotenvy = "0.15.7"')
replace('rustpad-server/src/main.rs','dotenv::dotenv()','dotenvy::dotenv()')
replace('rustpad-server/Cargo.toml','parking_lot = "0.11.1"','parking_lot = "0.12.5"')
replace('rustpad-server/Cargo.toml','pretty_env_logger = "0.4.0"','pretty_env_logger = "0.5.0"')
replace('rustpad-server/Cargo.toml','rand = "0.8.3"','rand = "0.9.2"')
replace('rustpad-server/Cargo.toml','sqlx = { version = "0.6.3", features = ["runtime-tokio-rustls", "sqlite"] }','sqlx = { version = "0.8.6", default-features = false, features = ["runtime-tokio-rustls", "sqlite", "macros", "migrate"] }')
replace('rustpad-server/Cargo.toml','warp = "0.3.1"','warp = { version = "0.4.3", features = ["server", "websocket"] }')
replace('rustpad-server/Cargo.toml','[dev-dependencies]','[dev-dependencies]\nwarp = { version = "0.4.3", features = ["test"] }')
replace('rustpad-server/tests/stress.rs', '        assert!(start.elapsed() <= Duration::from_millis(200));', '        assert!(start.elapsed() <= Duration::from_millis(200));\n        // Preserve the native latency assertion while respecting the 100/s service ceiling.\n        tokio::time::sleep(Duration::from_millis(50)).await;')
replace('rustpad-server/src/rustpad.rs', '            state.text = document.text;', '            state.history_bytes = serde_json::to_vec(&operation).expect("serialize operation").len();\n            state.text = document.text;')
replace('vite.config.ts', 'import topLevelAwait from "vite-plugin-top-level-await";\n', '')
replace('vite.config.ts', '    chunkSizeWarningLimit: 1000,', '    target: "es2022", // Native top-level await in current browsers; no compatibility transformer.\n    chunkSizeWarningLimit: 1000,')
replace('vite.config.ts', 'plugins: [wasm(), topLevelAwait(), react()]', 'plugins: [wasm(), react()]')

import json
manifest = root / 'package.json'
package = json.loads(manifest.read_text())
assert package['devDependencies'].pop('vite-plugin-top-level-await') == '^1.4.4'
manifest.write_text(json.dumps(package, indent=2) + '\n')
