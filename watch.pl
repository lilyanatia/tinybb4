#!/usr/bin/perl
use strict;
use open ':utf8';
use CGI;
use Linux::Inotify2;
use Fcntl ':flock';
use Time::HiRes qw/time sleep/;

BEGIN { $| = 1; }

my @stat;
my $query = CGI->new;
my $thread = $query->param('thread');
my $filename = 'threads';

if($thread =~ /^[0-9]+$/)
{ $filename = "thread/$thread"; }

print CGI::header(-type => 'text/event-stream',
                  -charset => 'UTF-8',
                  -cache_control => 'no-cache');
print "retry: 0\n";
my $last_id = $query->http('Last-Event-ID') or $query->https('Last-Event-ID');
@stat = stat($filename);
if($last_id == $stat[9])
{ my $inotify = new Linux::Inotify2();
  $inotify->watch($filename, IN_MODIFY | IN_CLOSE_WRITE);
  $inotify->blocking(0);
  my $end = time() + 30;
  while(!$inotify->read())
  { if(time() > $end)
    { print "\n";
      exit; }
    sleep 0.01; }}
open my $status, '<', $filename;
flock $status, LOCK_SH;
@stat = stat($status);
print "id: $stat[9]\n";
for my $line (<$status>)
{ chomp $line;
  print "data:$line\n"; }
flock $status, LOCK_UN;
close $status;
print "\n";
