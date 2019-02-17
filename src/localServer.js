const http = require("http"); // link http server : https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/

/* eslint-disable */
const serverHttp = http.createServer((request, response) => {
  console.log("request received method: " + request.method);
  const { headers, method, url } = request; //Get the headers, method, url, ... properties on the request object
  let body = "";
});
serverHttp.listen(9090);
