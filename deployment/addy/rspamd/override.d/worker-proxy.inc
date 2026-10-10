bind_socket = "127.0.0.1:11332";
count = 1;
milter = true;
timeout = 10s;
upstream "local" { default = yes; hosts = "127.0.0.1:11333"; }
