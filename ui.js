var threads;

$(document).ready(function()
{ $('body').append($('<div id="thread_button" class="reply_button">New thread</div>').click(function() { reply_form(-1); }));
  $.getJSON('threads', {}, update_threads); });

function update_threads(data)
{ threads = data.reverse(); 
  show_thread_list(); }

function show_thread_list()
{ var thread_list = $('<div id="thread_list"></div>');
  $('body').append(thread_list);
  for(var i = 0; i < threads.length; ++i)
  { var thread = $('<div>', { 'class': 'thread_title', 'id': threads[i].id });
    thread_list.append(thread);
    thread.append(threads[i].title); }
  $('.thread_title').click(show_thread); }

function show_thread()
{ var id = this.id;
  $(this).unbind('click', show_thread);
  this.style.cursor = 'default';
  $.getJSON('thread/' + id, {}, function(data) { add_comments(id, data); }); }

function add_comments(id, data)
{ var comments = $('<div class="thread"></div>');
  $('#' + id).append(comments);
  for(var i = 0; i < data.length; ++i)
  { var comment = $('<div>', { 'class': 'comment', 'id': id + '_' + (i + 1) });
    comment.append($('<div class="post_number">' + (i + 1) + '</div>'));
    comment.append($('<div>').text(data[i].comment));
    if(location.protocol == 'https:' && window.crypto && crypto.subtle && data[i].key) verify_signature(id, i, data[i]);
    comments.append(comment); }
  comments.append($('<div class="reply_button">Reply</div>').click(function() { reply_form($(this).parent().parent().id); })); }
  
function verify_signature(id, n, data)
{ var signature_data = new Uint8Array(256);
  for(var j = 0; j < 256; ++j) signature_data[j] = data.signature[j];
  console.log(data.key);
  crypto.subtle.importKey(
    'jwk', data.key,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
    true, ['verify']).then(
    function(key)
    { return crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
          key, signature_data, string_to_array(data.comment, Uint16Array)); },
    console.error.bind('Unable to import public key.')).then(
    function(result)
    { if(result)
      { $('#' + id + '_' + (n + 1)).addClass('valid');
        return crypto.subtle.digest({ name: 'SHA-1' }, string_to_array(data.key.n, Uint8Array)); }
      else
        $('#' + id + '_' + (n + 1)).addClass('invalid'); },
    console.error.bind('Unable to verify signature.')).then(
    function(digest)
    { if(digest)
      { $('#' + id + '_' + (n + 1)).attr('title', btoa(array_to_string(new Uint8Array(digest)))); }},
    console.error.bind('Unable to compute hash.')); }

function reply_form(id)
{ var container = $('<div id="reply_form">');
  $('body').append(container);
  var form = $('<form onsubmit="return false;"></form>');
  container.append(form);
  form.append($('<input>', { 'type': 'hidden', 'id': 'thread', 'value': id }));
  if(id < 0) form.append($('<input id="title" required placeholder="Title">'));
  form.append($('<textarea id="comment" rows="10" required placeholder="Comment"></textarea>'));
  if(location.protocol == 'https:' && window.crypto && crypto.subtle) form.append($('<textarea id="key" rows="1" placeholder="Key (optional)" onchange="update_preview()" onkeyup="update_preview()"></textarea><input type="text" disabled id="hash_preview"><input type="button" value="Generate Key" onclick="generate_key()">'));
  form.append($('<input type="submit" onclick="submit_form()">')); }

function generate_key()
{ crypto.subtle.generateKey(
   { name: 'RSASSA-PKCS1-v1_5',
     modulusLength: 2048,
     publicExponent: new Uint8Array([1, 0, 1]),
     hash: { name: 'SHA-512' } },
   true, ['sign', 'verify']).then(
   function(key)
   { return crypto.subtle.exportKey('jwk', key.privateKey); },
   console.error.bind(console, 'Unable to generate key.')).then(
   function(exported_key)
   { $('#key').val(JSON.stringify(exported_key));
     update_preview(); }); }

function update_preview()
{ var key = JSON.parse($('#key').val());
  if(!key.n) return;
  crypto.subtle.digest({ name: 'SHA-1' }, string_to_array(key.n, Uint8Array)).then(
  function(digest)
  { $('#hash_preview').val(btoa(array_to_string(new Uint8Array(digest)))); },
  console.error.bind('Unable to compute hash.')); }

function submit_form()
{ var title = $('#title').val();
  var thread = $('#thread').val();
  var comment = $('#comment').val();
  var key = $('#key').val();
  if(key)
  { var key_data = JSON.parse(key);
    crypto.subtle.importKey('jwk', key_data,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
      true, ['sign']).then(
      function(private_key)
      { delete key_data.d;
        delete key_data.dp;
        delete key_data.dq;
        delete key_data.p;
        delete key_data.q;
        delete key_data.qi;
        key_data.key_ops = ['verify']
        return crypto.subtle.sign(
          { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
          private_key, string_to_array(comment, Uint16Array)); },
      console.error.bind('Unable to import private key.')).then(
      function(signature_buffer)
      { var signature_data = new Uint8Array(signature_buffer);
        var signature = new Array(256);
        for(var i = 0; i < 256; ++i) signature[i] = signature_data[i];
        return signature; },
      console.error.bind('Unable to sign.')).then(
      function(signature)
      { crypto.subtle.importKey('jwk', key_data,
          { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
          true, ['verify']).then(
        function(public_key)
        { $.post('post',
            { 'title': title, 'thread': thread, 'comment': comment,
              'key': JSON.stringify(key_data),
              'signature': JSON.stringify(signature) },
            function() { location.reload(); }).fail(
            function() { alert('Post failed. Please check your input and try again.'); }); },
        console.error.bind('Unable to import public key.')); }); }
  else $.post('post', { 'title': title, 'thread': thread, 'comment': comment },
         function() { location.reload(); }).fail(
         function() { alert('Post failed. Please check your input and try again.'); }); }

function string_to_array(string, type)
{ var array = new type();
  for(var i = 0; i < string.length; ++i) array[i] = string.charCodeAt(i);
  return array; }

function array_to_string(array)
{ var string = '';
  for(var i = 0; i < string.length; ++i) string += String.fromCharCode(array[i]);
  return string; }
