const postmark = require("postmark");
const client = new postmark.Client(process.env.POSTMARK_API_KEY);

export function sendEmail(email, templateId, templateModel) {
	return new Promise(function(resolve, reject) {
		client.sendEmailWithTemplate({
			"From": "pubpub@media.mit.edu",
			"To": email,
			"TemplateId": templateId,
			"TemplateModel": templateModel
		}, function(err, result) {
			if (err) { reject(err); }
			resolve(result);
		});
	})
}
