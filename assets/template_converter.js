var raml2html = require('raml2html');
var configWithDefaultTemplates = raml2html.getDefaultConfig();
var configWithCustomTemplates = raml2html.getDefaultConfig('template.nunjucks', __dirname);

// source can either be a filename, url, file contents (string) or parsed RAML object
raml2html.render(source, configWithDefaultTemplates).then(function(result) {
  // Save the result to a file or do something else with the result
}, function(error) {
  // Output error
});
