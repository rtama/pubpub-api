To generate documentation run

raml2html -t template/template.nunjucks api.raml > index.html

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

### Useful scripts

Automatically generates the documentation from the raml and the template whenever the template is edited.

fswatch -0 template/template.nunjucks  | (xargs -0 -n1 -I{} raml2html -t template/template.nunjucks api.raml -o index.html)

### Useful resources

https://github.com/raml2html/raml2html/blob/master/examples/github.raml
