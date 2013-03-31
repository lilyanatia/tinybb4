tinybb4
=======
This is a new tiny bbs script. It currently lacks a lot of features, the most significant being that there is currently no way to bump threads.

tinybb4 API
===========

threads
-------
This file contains a list of threads as a JSON array. Each thread contains three items:

* The thread ```id```, as an integer.
* The thread ```title```, as a string.

thread/<id>
-----------
This file contains all the posts in the specified thread as a JSON array of strings.

post
----
Submit new posts here, using HTTP POST. Accepted inputs are:

* ```comment``` - The content of the post. Always required.
* ```thread``` - The thread you are replying to. If not present, a new thread will be created.
* ```title``` - The thread title for a new thread. Required if creating a new thread, ignored otherwise.
