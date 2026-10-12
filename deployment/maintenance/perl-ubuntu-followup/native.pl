use strict;use warnings;use utf8;
use Test::More;use File::Temp qw(tempdir);use Cwd qw(getcwd);use Archive::Tar;use IO::Compress::Gzip qw(gzip);use IO::Uncompress::Gunzip qw(gunzip);use JSON::PP;use Storable qw(nfreeze thaw);use Digest::SHA qw(sha256_hex);use MIME::Base64 qw(encode_base64 decode_base64);use Encode qw(encode decode);use Socket qw(inet_pton AF_INET);use File::Spec;
my $d=tempdir(CLEANUP=>1);chdir($d) or die $!;
my $text=encode('UTF-8',"Ficción — niña 12.34\n");
is(decode('UTF-8',$text),"Ficción — niña 12.34\n",'UTF-8 accents preserved');
is(decode_base64(encode_base64($text)),$text,'base64 binary roundtrip');
is(length(sha256_hex($text)),64,'native SHA256');
my $record={fictional=>JSON::PP::true,label=>'fixture',n=>12.34};
is_deeply(decode_json(encode_json($record)),$record,'JSON object roundtrip');
is_deeply(thaw(nfreeze($record)),$record,'Storable XS roundtrip');
is(length(inet_pton(AF_INET,'127.0.0.1')),4,'Socket XS loopback encoding');
my ($z,$plain);ok(gzip(\$text=>\$z),'gzip encode');ok(gunzip(\$z=>\$plain),'gzip decode');is($plain,$text,'gzip content preserved');
my $tar=Archive::Tar->new();$tar->add_data('fictional.txt',$text);ok($tar->write('fixture.tar'),'native tar write');
my $read=Archive::Tar->new('fixture.tar');is($read->get_content('fictional.txt'),$text,'native tar read');ok($read->extract(),'native extract');
open(my $f,'<:raw','fictional.txt') or die $!;local $/;is(<$f>,$text,'extracted bytes');close($f);
# A tiny synthetic archive exercises the native configured cap, never a large
# allocation or live file. The old image is a deliberate negative control.
my @warnings;my $guarded;{
 no warnings 'once';local $Archive::Tar::MAX_FILE_SIZE=4;local $SIG{__WARN__}=sub{push @warnings,@_};
 $guarded=Archive::Tar->new('fixture.tar');
}
if($ENV{EXPECT_FIXED}){ok(!$guarded || !$guarded->contains_file('fictional.txt'),'oversized entry refused');like(join('',@warnings),qr/exceeds.*MAX_FILE_SIZE/s,'bounded rejection explained');}
else{ok($guarded->contains_file('fictional.txt'),'old cap absence reproduced with tiny archive');}
done_testing();
