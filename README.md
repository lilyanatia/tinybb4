tinybb4
=======
This is a new tiny bbs script.

tinybb4 API
===========

threads
-------
This file contains a list of threads as a JSON array. Each thread contains an ```id``` (integer) and a ```title``` (string).

thread/```id```
-----------
This file contains all the posts in the specified thread as a JSON array. Each post contains a ```comment``` (string) and may also contain a ```key``` (JSON Web Key) and ```signature``` (array of integers)

post
----
Submit new posts here, using HTTP POST. Accepted inputs are:

* ```comment``` - The content of the post. Always required.
* ```thread``` - The thread you are replying to. If not present, a new thread will be created.
* ```title``` - The thread title for a new thread. Required if creating a new thread, ignored otherwise.
* ```key``` - An RSA (RS512) public key in JSON Web Key format. Not required.
* ```signature``` - A signature as a JSON array of integers. Not required.
