; <?php exit; ?>
[system]
enabled_bridges[] = GithubTrendingBridge
enabled_bridges[] = TheGuardianBridge
enabled_bridges[] = ArsTechnicaBridge
timezone = "UTC"
enable_debug_mode = false
max_file_size = 5000000
message = "Selected public feeds; cached responses; no accounts. Some upstream sites may be unavailable. / Fuentes públicas seleccionadas; respuestas en caché; sin cuentas. Algunas fuentes pueden fallar. <a href='https://utilibre.org/en/'>More tools from Utilibre</a> · <a href='https://utilibre.org/es/'>Más herramientas de Utilibre</a>"
[http]
timeout = 10
retries = 0
max_filesize = 5
[cache]
type = "file"
custom_timeout = false
[FileCache]
path = "/app/cache"
enable_purge = true
[error]
output = "http"
[admin]
donations = true
