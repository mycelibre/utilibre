filters = "dkim";
# Authentication does not need the stock content-pattern compilation cache.
disable_hyperscan = true;
local_addrs = [];
explicit_modules = [];
dns_max_requests = 32;
dns { timeout = 1s; retransmits = 1; sockets = 4; }
task_timeout = 8s;
soft_reject_on_timeout = true;
history_rows = 0;
history_file = null;
rrd = null;
stats_file = null;
