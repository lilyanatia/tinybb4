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
    if(window.crypto && crypto.subtle && data[i].key) verify_signature(id, i, data[i]);
    comments.append(comment); }
  comments.append($('<div class="reply_button">Reply</div>').click(function() { reply_form($(this).parent().parent().id); })); }
  
function verify_signature(id, n, data)
{ var length = data.comment.length;
  var comment_data = new Uint16Array(length);
  for(var j = 0; j < length; ++j) comment_data[j] = data.comment.charCodeAt(j);
  var signature_data = new Uint8Array(256);
  for(var j = 0; j < 256; ++j) signature_data[j] = JSON.parse(data.signature)[j];
  console.log('verify: ' + n);
  crypto.subtle.importKey(
    'jwk', JSON.parse(data.key),
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
    true, ['verify']).then(
    function(key)
    { crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
          key, signature_data, comment_data).then(
          function(result)
          { if(result)
            { $('#' + id + '_' + (n + 1)).addClass('valid');
              var k = JSON.parse(data.key).n;
              var length = k.length;
              var key_data = new Uint8Array(length);
              for(var j = 0; j < length; ++j) key_data[j] = k.charCodeAt(j);
              crypto.subtle.digest({ name: 'SHA-1' }, key_data).then(
                function(digest)
                { var digest_data = new Uint8Array(digest);
                  var a = new Array();
                  for(var j = 0; j < 20; ++j) a[j] = digest_data[j]; 
                  $('#' + id + '_' + (n + 1)).attr('title', btoa(a)); }); }
            else
              $('#' + id + '_' + (n + 1)).addClass('invalid'); }); }); }

function reply_form(id)
{ var container = $('<div id="reply_form">');
  $('body').append(container);
  var form = $('<form onsubmit="return false;"></form>');
  container.append(form);
  form.append($('<input>', { 'type': 'hidden', 'id': 'thread', 'value': id }));
  if(id < 0) form.append($('<input id="title" required placeholder="Title">'));
  form.append($('<textarea id="comment" rows="10" required placeholder="Comment"></textarea>'));
  if(window.crypto && crypto.subtle) form.append($('<textarea id="key" rows="1" placeholder="Key (optional)"></textarea><input type="button" value="Generate Key" onclick="generate_key()">'));
  form.append($('<input type="submit" onclick="submit_form()">')); }

function generate_key()
{ crypto.subtle.generateKey(
   { name: 'RSASSA-PKCS1-v1_5',
     modulusLength: 2048,
     publicExponent: new Uint8Array([1, 0, 1]),
     hash: { name: 'SHA-512' } },
   true, ['sign', 'verify']).then(
   function(key)
   { crypto.subtle.exportKey('jwk', key.privateKey).then(
      function(exported_key)
      { $('#key').val(JSON.stringify(exported_key)); }); }); }

function submit_form()
{ var title = $('#title').val();
  var thread = $('#thread').val();
  var comment = $('#comment').val();
  var key = $('#key').val();
  if(key)
  { var length = comment.length;
    var comment_data = new Uint16Array(length);
    var key_data = JSON.parse(key);
    for(var i = 0; i < length; ++i) comment_data[i] = comment.charCodeAt(i);
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
        crypto.subtle.importKey('jwk', key_data,
          { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
          true, ['verify']).then(
          function(public_key)
          { crypto.subtle.sign(
              { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' }},
              private_key, comment_data).then(
              function(signature_buffer)
              { var signature_data = new Uint8Array(signature_buffer);
                var signature = new Array(256);
                for(var i = 0; i < 256; ++i) signature[i] = signature_data[i];
                console.log({ 'title': title, 'thread': thread, 'comment': comment,
                         'key': JSON.stringify(key_data),
                         'signature': JSON.stringify(signature) });
                $.post('post',
                       { 'title': title, 'thread': thread, 'comment': comment,
                         'key': JSON.stringify(key_data),
                         'signature': JSON.stringify(signature) },
                       function() { location.reload(); }).fail(
                       function() { alert('Post failed. Please check your input and try again.'); }); }); }); }); }
  else $.post('post', { 'title': title, 'thread': thread, 'comment': comment },
         function() { location.reload(); }).fail(
         function() { alert('Post failed. Please check your input and try again.'); }); }
