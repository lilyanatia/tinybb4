var threads = [], thread_watch = [], jwk_wants_array = false,
  vowels = 'aeiouy', consonants = 'bcdfghklmnprstvzx', algorithms =
{ 'RSA':
  { 'RS1':
    { name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-1' } },
    'RS256':
    { name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' } },
    'RS384':
    { name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-512' } },
    'RS512':
    { name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-512' } },
    /* RSA-PSS disabled until browsers support it.
    'PS256':
    { name: 'RSA-PSS',
      hash: { name: 'SHA-256' } },
    'PS384':
    { name: 'RSA-PSS',
      hash: { name: 'SHA-384' } },
    'PS512':
    { name: 'RSA-PSS',
      hash: { name: 'SHA-512' } } */ },
  /* ECDSA disabled until browsers support it.
  'EC':
  { 'ES256':
    { name: 'ECDSA',
      namedCurve: 'P-256',
      hash: { name: 'SHA-256' } },
    'ES384':
    { name: 'ECDSA',
      namedCurve: 'P-384',
      hash: { name: 'SHA-384' } },
    'ES512':
    { name: 'ECDSA',
      namedCurve: 'P-521',
      hash: { name: 'SHA-512' } } } */ };

$(document).ready(function()
{ var watch,
    reply_button = $('<div id="thread_button" class="reply_button">New thread</div>'),
    thread_list = $('<div id="thread_list"></div>');
  reply_button.click(function() { reply_form(-1); });
  $('body').append(reply_button);
  if(window.crypto && crypto.subtle)
  { crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 256,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: 'SHA-1' } },
      true, []).then(
      function(key)
      { return crypto.subtle.exportKey('jwk', key.publicKey); },
      console.error.bind(console, 'Unable to generate key.')).then(
      function(exported_key)
      { if(exported_key instanceof ArrayBuffer) jwk_wants_array = true; },
      console.error.bind(console, 'Unable to export public key.')); }
  $('body').append(thread_list);
  if(window.EventSource)
  { watch = new EventSource('watch.pl');
    watch.addEventListener('message', function(e)
    { update_threads(JSON.parse(e.data)); }); }
  else $.getJSON('threads', {}, update_threads); });

function update_threads(data)
{ var old_threads = threads, thread, i,
      count = data.length - old_threads.length,
      thread_list = $('#thread_list');
  threads = data;
  for(i = 0; i < count; ++i)
  { thread = $('<div>', { 'class': 'thread_title', 'id': threads[i].id });
    thread_list.prepend(thread);
    thread.append(threads[i].title); }
  $('.thread_title').click(show_thread); }

function show_thread()
{ var id = this.id;
  $(this).unbind('click', show_thread);
  $(this).bind('click', hide_thread); 
  if(window.EventSource)
  { thread_watch[id] = new EventSource('watch.pl?thread=' + id);
    thread_watch[id].addEventListener('message', function(e)
    { add_comments(id, JSON.parse(e.data)); }); }
  else $.getJSON('thread/' + id, {}, function(data)
  { add_comments(id, data); }); 
}

function hide_thread()
{ var id = this.id;
  $(this).children().remove();
  thread_watch[id].close();
  $(this).unbind('click', hide_thread);
  $(this).bind('click', show_thread); }

function add_comments(id, data)
{ var title = $('#' + id),
      comments, i, comment;
  if(title.children().length)
  { comments = title.children().first();
    comments.children().last().remove(); }
  else
  { comments = $('<div class="thread"></div>');
    $('#' + id).append(comments); }
  comments.bind('click', function() { return false; });
  for(i = comments.children().length; i < data.length; ++i)
  { comment = $('<div>', { 'class': 'comment', 'id': id + '_' + (i + 1) });
    comment.append($('<div class="post_number">' + (i + 1) + '</div>'));
    comment.append($('<div>').text(data[i].comment));
    if(window.crypto && crypto.subtle && data[i].key)
      verify_signature(id, i, data[i]);
    comments.append(comment); }
  comments.append($('<div class="reply_button">Reply</div>').click(function() { reply_form(id); })); }
  
function verify_signature(id, n, data)
{ var signature_data = new Uint8Array(256), i, key,
    algorithm = algorithms[data.key.kty][data.key.alg];
  for(i = 0; i < 256; ++i) signature_data[i] = data.signature[i];
  crypto.subtle.importKey(
    'jwk', jwk_object_to_import(data.key), algorithm, true, ['verify']).then(
    function(k)
    { key = k;
      return crypto.subtle.verify(
        algorithm, key, signature_data,
        string_to_array(data.comment, Uint16Array)); },
    console.error.bind(console, 'Unable to import public key.')).then(
    function(result)
    { if(result)
      { $('#' + id + '_' + (n + 1)).addClass('valid');
        return crypto.subtle.exportKey('jwk', key); }
      else
        $('#' + id + '_' + (n + 1)).addClass('invalid'); },
    console.error.bind(console, 'Unable to verify signature.')).then(
    function(exported)
    { console.log(exported);return crypto.subtle.digest(
      { name: 'SHA-256' }, jwk_export_to_array(exported)); },
    console.error.bind(console, 'Unable to export key.')).then(
    function(digest)
    { if(digest)
      { $('#' + id + '_' + (n + 1)).attr('title',
          bubble_babble(new Uint8Array(digest))); }},
    console.error.bind(console, 'Unable to compute hash.')); }

function reply_form(id)
{ var container = $('<div id="reply_form">'),
      form = $('<form onsubmit="return false;"></form>'),
      close_button = $('<div id="close">×</div>');
  $('body').append(container);
  container.append(form);
  close_button.click(function() { $('#reply_form').remove(); });
  form.append(close_button);
  form.append($('<input>', { 'type': 'hidden', 'id': 'thread', 'value': id }));
  if(id < 0) form.append($('<input id="title" required placeholder="Title">'));
  form.append($('<textarea id="comment" rows="10" required placeholder="Comment"></textarea>'));
  if(window.crypto && crypto.subtle)
  { form.append($('<textarea id="key" rows="1" placeholder="Key (optional)" onchange="update_preview()" onkeyup="update_preview()"></textarea>'));
    form.append($('<input type="text" disabled id="hash_preview">'));
    form.append($('<input type="button" value="Generate Key" onclick="generate_key(algorithms.RSA.RS256)">')); }
  form.append($('<input type="submit" onclick="submit_form()">')); }

function generate_key(algorithm)
{ if(algorithm.name.startsWith('RSA'))
  { if(!algorithm.publicExponent)
      algorithm.publicExponent = new Uint8Array([1, 0, 1]);
    if(!algorithm.modulusLength)
      algorithm.modulusLength = 2048; }
  crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']).then(
   function(key)
   { return crypto.subtle.exportKey('jwk', key.privateKey); },
   console.error.bind(console, 'Unable to generate key.')).then(
   function(exported_key)
   { $('#key').val(jwk_export_to_string(exported_key));
     update_preview(); }); }

function update_preview()
{ var key = JSON.parse($('#key').val());
  delete key.d;
  delete key.dp;
  delete key.dq;
  delete key.p;
  delete key.q;
  delete key.qi;
  key.key_ops = ['verify'];
  crypto.subtle.importKey( 'jwk', jwk_object_to_import(key),
    algorithms[key.kty][key.alg], true, ['verify']).then(
    function(k)
    { key = k;
      return crypto.subtle.exportKey('jwk', key); },
    console.error.bind(console, 'Unable to import key.')).then(
    function(exported)
    { if(exported) return crypto.subtle.digest(
      { name: 'SHA-256' }, jwk_export_to_array(exported)); },
    console.error.bind(console, 'Unable to export key.')).then(
    function(digest)
    { $('#hash_preview').val(bubble_babble(new Uint8Array(digest))); },
    console.error.bind(console, 'Unable to compute hash.')); }

function submit_form()
{ var title = $('#title').val(),
      thread = $('#thread').val(),
      comment = $('#comment').val(),
      key = $('#key').val(),
      key_data;
  if(key)
  { key_data = JSON.parse(key),
      algorithm = algorithms[key_data.kty][key_data.alg];
    crypto.subtle.importKey('jwk', jwk_object_to_import(key_data), algorithm,
      true, ['sign']).then(
      function(private_key)
      { delete key_data.d;
        delete key_data.dp;
        delete key_data.dq;
        delete key_data.p;
        delete key_data.q;
        delete key_data.qi;
        key_data.key_ops = ['verify']
        return crypto.subtle.sign( algorithm, private_key,
          string_to_array(comment, Uint16Array)); },
      console.error.bind(console, 'Unable to import private key.')).then(
      function(signature_buffer)
      { var signature_data = new Uint8Array(signature_buffer),
            signature = new Array(256), i;
        for(i = 0; i < 256; ++i) signature[i] = signature_data[i];
        return signature; },
      console.error.bind(console, 'Unable to sign.')).then(
      function(signature)
      { $.post('post.pl',
          { 'title': title, 'thread': thread, 'comment': comment,
            'key': JSON.stringify(key_data),
            'signature': JSON.stringify(signature) },
          function()
          { if(window.EventSource) $('#reply_form').remove();
            else location.reload(); }).fail(
          function() { alert('Post failed. Please check your input and try again.'); }); }); }
  else $.post('post.pl', { 'title': title, 'thread': thread, 'comment': comment },
         function()
         { if(window.EventSource) $('#reply_form').remove();
           else location.reload(); }).fail(
         function() { alert('Post failed. Please check your input and try again.'); }); }

function string_to_array(string, type)
{ var array = new type(string.length), i;
  for(i = 0; i < string.length; ++i) array[i] = string.charCodeAt(i);
  return array; }

function array_to_string(array)
{ var string = '', i;
  for(i = 0; i < array.length; ++i) string += String.fromCharCode(array[i]);
  return string; }

function jwk_export_to_string(k)
{ if(k instanceof ArrayBuffer) return array_to_string(new Uint8Array(k));
  return JSON.stringify(k); }

function jwk_export_to_array(k)
{ if(k instanceof ArrayBuffer) return k;
  return string_to_array(JSON.stringify(k), Uint8Array); }

function jwk_object_to_import(k)
{ if(jwk_wants_array) return string_to_array(JSON.stringify(k), Uint8Array);
  return k; }

function op(r, c)
{ var x = (((r >> 6) & 3) + c) % 6,
      y = (r >> 2) & 15,
      z = ((r & 3) + Math.floor(c / 6)) % 6;
  return vowels.charAt(x) + consonants.charAt(y) + vowels.charAt(z); }

function ep(c)
{ var x = c % 6,
      y = Math.floor(c / 6);
  return vowels.charAt(x) + 'x' + vowels.charAt(y); }

function nc(c, a, b)
{ return ((c * 5) + (a * 7) + b) % 36; }

function bubble_babble(a)
{ var s = 'x', c = 1, l = a.length, i;
  for(i = 0; i + 1 < l; i += 2)
  { s += op(a[i], c);
    s += consonants.charAt((a[i + 1] >> 4) & 15) + '-' +
      consonants.charAt(a[i + 1]);
    c = nc(c, a[i], a[i + 1]); }
  s += (i < l ? op(a[i], c) : ep(c)) + 'x';
  return s; }
