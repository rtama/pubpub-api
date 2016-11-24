import app from '../../server';
import { License } from '../../models';

export function getLicenses(req, res, next) {
	
	const licenseQuery = req.query.licenseId ? { id: req.query.licenseId } : {};

	License.findAll({
		where: licenseQuery,
		attributes: { exclude: ['createdAt', 'updatedAt'] }
	})
	.then(function(results) {
		return res.status(201).json(results);
	})
	.catch(function(err) {
		console.error('Error in getLicenses: ', err);
		return res.status(500).json(err.message);
	});
}
app.get('/licenses', getLicenses);
