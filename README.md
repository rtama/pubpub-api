# Introduction

The goal of this API is to give access to all of the publicly available resources on PubPub.

Accessing resources or actions that require authentication will be supported soon.

# Running Locally

First, create a `config.js` file to configure the MongoDB URI. See `config.sample.js` for an example.

Then run:

```
npm install
npm run start
npm run build-docs
```
`npm run buid-docs` will need to be run each time the template or api.raml is changed.


### TO-DO

Determine best format for responding with errors

### Info

Abao is pretty cool for testing

https://github.com/cybertk/abao

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

fswatch -0 api.raml template/template.nunjucks   | (xargs -0 -n1 -I{} raml2html -t template/template.nunjucks api.raml -o index.html)

### Useful resources

https://github.com/raml2html/raml2html/blob/master/examples/github.raml
