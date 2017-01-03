const sendgridKey = process.env.SENDGRID_API_KEY;
const helper = require('sendgrid').mail;
const sendgrid = require('sendgrid')(sendgridKey);

const fromname = 'PubPub';
const from = 'team@pubpub.org';


export function sendResetEmail(obj){ return new Promise(
	// The resolver function is called with the ability to resolve or
	// reject the promise
	function(resolve, reject) {
		const mail = new helper.Mail();
		const personalization = new helper.Personalization();

		const fromEmail = new helper.Email(from, fromname);

		mail.setFrom(fromEmail);
		mail.setSubject('PubPub Password Reset!');

		const toEmail = new helper.Email(obj.email, obj.username);
		personalization.addTo(toEmail);
		mail.addPersonalization(personalization);

		const resetURL = 'http://www.pubpub.org/resetpassword/' + obj.hash + '/' + obj.username;

		const contentText = new helper.Content('text/plain', 'Reset Password. We\'ve received a password reset request for your account. To reset, visit ' + resetURL + ' . If you did not request this reset - simply delete this email.');
		const contentHtml = new helper.Content('text/html', '<h1 style="color: #373737;">Reset Password</h1> <p style="color: #373737;">We\'ve received a password reset request for your account.</p> <p style="color: #373737;">To reset, visit <a href="' + resetURL + '">' + resetURL + '</a></p> <p style="color: #373737;">If you did not request this reset - simply delete this email.</p>');
		mail.addContent(contentText);
		mail.addContent(contentHtml);

		mail.setTemplateId('caad4e63-a636-4c81-9cc2-7d65e581a876');

		const request = sendgrid.emptyRequest({
			method: 'POST',
			path: '/v3/mail/send',
			body: mail.toJSON(),
		});
		sendgrid.API(request, function(error, response) {
			if (error) {
				throw new Error('Error sending email. Please contact PubPub Support.');
			}
			resolve(response);
		});
	});
}
