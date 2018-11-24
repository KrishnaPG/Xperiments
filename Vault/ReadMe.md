
# Create Policy to allow actions on the required path
Using the [ACL Create](http://127.0.0.1:8200/ui/vault/policies/acl/create) link create a new policy, or edit the `default` policy to include the below section to give access to all operations on the `transit` path
````
# This section grants all access on "transit/*". Further restrictions can be
# applied to this broad policy, as shown below.
path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
````
Note: This policy should be created **before** creating the role. 

## Crate token with policy applied
A token can be created with policy applied to it using the command
````
vault token create -policy=transit-policy
````
This token may get expired, and has to be renewed periodically.

# Create the App RoleId and SecretId
````
vault auth enable approle
vault write auth/approle/role/test-role policies=transit-policy
vault read auth/approle/role/test-role/role-id
vault write -f auth/approle/role/test-role/secret-id
````
Use the `role_id` and `secret_id` with the `login` endpoint to get the `client_token` that can be used for accessing the secrets later on.

Ref: https://www.vaultproject.io/docs/auth/approle.html


To update the policy associated with a role
````
vault write auth/approle/role/role1 policies=default,token-policy
````
