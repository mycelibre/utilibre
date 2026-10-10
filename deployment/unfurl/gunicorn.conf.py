# Preload native modules before worker forks. Header-only mode skips the unused
# bulk reputation lists; normal upstream mode retains its native preload.
preload_app = True

def on_starting(server):
    from unfurl.core import preload_reference_data
    preload_reference_data()
