To generate documentation run

raml2html api.raml > example.html

This is dependent on raml2html which can be installed with homebrew.


One example request:

curl --data '{"name" :"hassan"}' \;
localhost:9876/users/0


Old schema data, for
application/json:
  schema: |
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      }
    }
