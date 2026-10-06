; <?php exit; ?>
[system]
enabled_bridges[] = GithubTrendingBridge
enabled_bridges[] = TheGuardianBridge
enabled_bridges[] = ArsTechnicaBridge
timezone = "UTC"
enable_debug_mode = false
max_file_size = 5000000
message = "Selected public feeds. Cached responses; no accounts. Some upstream sites may be unavailable. Contact: https://github.com/mycelibre/utilibre/issues"
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
