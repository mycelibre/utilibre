use strict; use warnings; use utf8;
use Test::More; use File::Temp qw(tempdir); use Archive::Tar; use Encode qw(encode);
use IO::Compress::Gzip qw(gzip); use IO::Uncompress::Gunzip qw(gunzip);
my $d=tempdir(CLEANUP=>1);chdir($d) or die $!;
my $fixed=$ENV{EXPECT_FIXED}||$ENV{EXPECT_VENDOR_FIXED};
if($ENV{EXPECT_FIXED}){is($Archive::Tar::VERSION,'3.14','upstream release executed');is($INC{'Archive/Tar.pm'},'/usr/share/perl5/Archive/Tar.pm','native vendor path selected');}
my $text=encode('UTF-8',"Ficción — niña 12.34\n");my $a=Archive::Tar->new();$a->add_data('fictional.txt',$text);ok($a->write('normal.tar'),'write');
my $b=Archive::Tar->new('normal.tar');is($b->get_content('fictional.txt'),$text,'Unicode/binary bytes');ok($b->extract(),'extract');
my $z;ok(gzip('normal.tar'=>\$z),'gzip archive');open(my $zf,'>:raw','normal.tgz') or die $!;print {$zf}$z;close $zf;
is(Archive::Tar->new('normal.tgz')->get_content('fictional.txt'),$text,'compressed read');
my @warnings;my $guarded;{no warnings 'once';local $Archive::Tar::MAX_FILE_SIZE=4;local $SIG{__WARN__}=sub{push @warnings,@_};$guarded=Archive::Tar->new('normal.tar');}
if($fixed){ok(!$guarded||!$guarded->contains_file('fictional.txt'),'declared-size cap rejects before allocation');like(join('',@warnings),qr/exceeds.*MAX_FILE_SIZE/s,'cap explanation');}
else{ok($guarded->contains_file('fictional.txt'),'small negative control proves absent old cap');}
# Keep the known recovery regression visible with bounded synthetic data.
# Do not allocate gigabytes or treat a cap as immunity to all resource abuse.
my $m=Archive::Tar->new();$m->add_data('large.txt','x'x2048);$m->add_data('small.txt','safe');$m->write('mixed.tar');
my $read;my @recovery;{no warnings 'once';local $Archive::Tar::MAX_FILE_SIZE=1024;local $SIG{__WARN__}=sub{push @recovery,@_};$read=Archive::Tar->new('mixed.tar');}
is($read->get_content('small.txt'),'safe','later valid entry remains readable');
if($fixed){ok(!$read->contains_file('large.txt'),'oversized entry omitted');diag('Known upstream issue47: warnings='.scalar(@recovery).' for bounded 2048-byte rejected member');}
done_testing();
