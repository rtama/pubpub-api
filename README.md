curl --data '{"name" :"hassan"}' \
localhost:9876/users/0


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
