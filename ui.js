var threads;
var oldthreads;

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
  $.getJSON('thread/' + id, {},
    function(data) { add_comments(id, data); }); }

function add_comments(id, data)
{ var comments = $('<div class="thread"></div>');
  $('#' + id).append(comments);
  for(var i = 0; i < data.length; ++i)
  { var comment = $('<div>', { 'class': 'comment', 'id': id + '_' + (i + 1) });
    comment.append($('<div class="post_number">' + (i + 1) + '</div>'));
    comment.append($('<div>').text(data[i]));
    comments.append(comment); }
    comments.append($('<div class="reply_button">Reply</div>').click(
      function() { reply_form($(this).parent().parent().id); })); }

function reply_form(id)
{ var container = $('<div id="reply_form">');
  $('body').append(container);
  var form = $('<form onsubmit="return false;"></form>');
  container.append(form);
  form.append($('<input>', { 'type': 'hidden', 'id': 'thread', 'value': id }));
  if(id < 0)
    form.append($('<input id="title" required placeholder="Title">'));
  form.append($('<textarea id="comment" rows="10" required placeholder="Comment"></textarea>'));
  form.append($('<input type="submit" onclick="submit_form()">')); }

function submit_form()
{ var title = $('#title').val();
  var thread = $('#thread').val();
  var comment = $('#comment').val();
  $.post('post', { 'title': title, 'thread': thread, 'comment': comment }, function() { location.reload(); }).fail(function() { alert('Post failed. Please check your input and try again.'); }); }
