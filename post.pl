#!/usr/bin/env perl

#TODO: reject posts with invalid signatures

use strict;
use open ':utf8';
use Fcntl qw(:flock);
use Encode;
use JSON;
use CGI;
$CGI::POST_MAX = 4096;

binmode STDOUT, ':utf8';

my $query = CGI->new;
my $thread_json;

if($query->request_method() != 'POST') { print $query->header(-status => '405 Method Not Allowed'); exit; }
$query->import_names('P');
bad_request() unless length($P::comment) > 0;
$P::comment = decode utf8=>$P::comment;
$P::title = decode utf8=>$P::title;
$P::thread = $P::thread + 0;
if($P::thread < 0) { $P::thread = create_thread($P::title, $P::comment, $P::key, $P::signature); }
else { add_post($P::thread, $P::comment, $P::key, $P::signature); }
print $query->header('application/json', '201 Created', -Location => thread_path($P::thread)), $thread_json;

sub bad_request()
{ print $query->header(-status => '400 Bad Request'); exit; }

sub thread_path($)
{ my ($thread) = @_;
  my $full = $ENV{'SCRIPT_NAME'};
  $full =~ s!/[^/]*$!/thread/$thread!;
  return $full; }

sub create_thread($$$$)
{ my ($title, $comment, $key, $signature) = @_;
  if($key)
  { $key = from_json($key);
    bad_request() unless
      $key->{'kty'} == 'RSA' && $key->{'alg'} =~ /^RS[0-9]+$/; }
  bad_request() unless $title;
  open my $threads_file, '+<', 'threads';
  binmode $threads_file, ':utf8';
  flock $threads_file, LOCK_EX;
  my $threads = from_json(join '', <$threads_file>);
  my @threads = @{$threads}; 
  @threads[@threads + 0] = { 'id' => @threads + 0, 'title' => $title };
  seek $threads_file, 0, 0;
  print $threads_file to_json(\@threads);
  flock $threads_file, LOCK_UN;
  close $threads_file;
  open my $thread_file, '>', "thread/$#threads";
  binmode $thread_file, ':utf8';
  flock $thread_file, LOCK_EX;
  $thread_json = to_json(
    [ $key ?
      { 'comment' => $comment,
        'key' => $key,
        'signature' => from_json($signature) } :
      { 'comment' => $comment }
    ]);
  print $thread_file $thread_json;
  flock $thread_file, LOCK_UN;
  close $thread_file;
  return $#threads; }

sub add_post($$$$)
{ my ($thread, $comment, $key, $signature) = @_;
  bad_request() unless -e "thread/$thread";
  open my $thread_file, '+<', "thread/$thread";
  binmode $thread_file, ':utf8';
  flock $thread_file, LOCK_EX;
  my $thread = from_json(join '', <$thread_file>);
  my @thread = (@{$thread},
    $key ?
    { 'comment' => $comment,
      'key' => from_json($key),
      'signature' => from_json($signature) } :
    { 'comment' => $comment } );
  seek $thread_file, 0, 0;
  $thread_json = to_json(\@thread);
  print $thread_file $thread_json;
  flock $thread_file, LOCK_UN;
  close $thread_file; }
