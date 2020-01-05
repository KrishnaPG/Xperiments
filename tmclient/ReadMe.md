# Tendermint RPC Client
This works by creating JSON-RPC websocket wrappers over the Tendermint RPC methods retrieved from the official Tendermint RPC Swagger definition file ([here](https://docs.tendermint.com/master/rpc/swagger.yaml)).

To update the definitions:
  1. download the latest swagger file and put it in the `generator` folder, 
  2. run the below command from the current folder. It will **overwrite** the `rpcMethods.js` file.
  ````
    node ./generate/index.js ./rpcMethods.js
  ````

On *post-install* the generation is done automatically once.