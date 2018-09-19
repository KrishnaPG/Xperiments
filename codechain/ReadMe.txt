Command to start CodeChain:
  target/release/codechain --db-path db/db0 --port 3485 --jsonrpc-port 8080 --engine-signer tccqzaa3x0jkh7w6lfz3nzrszupawdpxsljlsuv74yc -c tendermint --password-path password.json

Contents of password.json file:
[
  {
    "address": "tccqzaa3x0jkh7w6lfz3nzrszupawdpxsljlsuv74yc",
    "password": "your password"
  }
]
