Step 1:- Run command and create patch,snapshot -> (all command should work as per the command functionality)

Step 2:- use loadversion function in server.js or initial file where server restart so that it will load all the version in cache memory all the version mean all code (where it construct the version with  base+patch+hotfix) as per current it is doing 

Step 3:- use Middleware function in file to route request suppose we have

domain/api/v1/user

and where we added route for /api we here add a middleware of apiver package so that we can serve the response as per version mention in url

Some Pointers
1:- 