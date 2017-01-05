if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const Sequelize = require('sequelize');
const passportLocalSequelize = require('passport-local-sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false, dialectOptions: { ssl: true } });

// Change to true to update the model in the database.
// NOTE: This being set to true will erase your data.
sequelize.sync({ force: false });

// Used to collect emails to create user accounts with.
// Trigger is attached such that emails are sent when a new row is added.
const SignUp = sequelize.define('SignUp', {
	email: { 
		type: Sequelize.STRING, 
		allowNull: false, 
		unique: true,
		validate: {
			isEmail: true
		} 
	},
	hash: Sequelize.TEXT,
	count: Sequelize.INTEGER,
	completed: Sequelize.BOOLEAN,
});

SignUp.hook('afterCreate', function(user, options) {
	console.debug('Just created SignUp row ', user.dataValues);
	// What happens if they resend an email? We should track that.
	// What happens if they close the tab, and then want to signup again? Do we increment the resend count. Probably.
	// Call email service here!
});
SignUp.hook('afterUpdate', function(user, options) {
	console.debug('Just updated SignUp row ', user.dataValues);
	// If completed is still false, send email!
	// Call email service.
});


const User = sequelize.define('User', {
	username: { 
		type: Sequelize.STRING, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
			isAlphanumeric: true, // No special characters
			is: /^.*[A-Za-z]+.*$/, // Must contain at least one letter
		},
	},
	firstName: { type: Sequelize.STRING, allowNull: false },
	lastName: { type: Sequelize.STRING, allowNull: false },
	image: { type: Sequelize.STRING },
	email: { 
		type: Sequelize.TEXT, 
		allowNull: false, 
		unique: true,
		validate: {
			isEmail: true,
			isLowercase: true,
		} 
	},
	isUnclaimed: Sequelize.BOOLEAN, // Used to add a user/author to a pub that isn't in the system. When claimed, the foreign keys are changed/merged with the real account.
	bio: Sequelize.TEXT,
	publicEmail: Sequelize.TEXT,
	github: Sequelize.STRING,
	orcid: Sequelize.STRING,
	twitter: Sequelize.STRING,
	website: Sequelize.STRING,
	googleScholar: Sequelize.STRING,
	accessToken: Sequelize.STRING,
	resetHashExpiration: Sequelize.DATE,
	resetHash: Sequelize.TEXT,
	inactive: Sequelize.BOOLEAN,

	hash: Sequelize.TEXT,
	salt: Sequelize.STRING,
});

passportLocalSequelize.attachToUser(User, {
	usernameField: 'email',
	hashField: 'hash',
	saltField: 'salt'
});

const Pub = sequelize.define('Pub', {
	slug: {
		type: Sequelize.TEXT, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
		},
	},
	// publicSlug: { type: Sequelize.STRING }, // Used to share a pub without making it globally public
	title: { type: Sequelize.TEXT, allowNull: false },
	description: { type: Sequelize.TEXT },
	previewImage: { type: Sequelize.TEXT },
	// isReply: { type: Sequelize.BOOLEAN }, // May not be necessary. Presence of rootReplyPubId dictates isReply
	isClosed: { type: Sequelize.BOOLEAN }, // Used for replies.
	hideAuthorsList: { type: Sequelize.BOOLEAN },
	customAuthorList: { type: Sequelize.TEXT },
	distinguishedClone: { type: Sequelize.BOOLEAN }, // ??TODO: Decide: Used to make a clone a 'distinguished branch'. Maybe this should be done with labels instead? If labels, then we have some weird permissioning conflicts between pub owners
	inactive: Sequelize.BOOLEAN,
	isPublished: Sequelize.BOOLEAN,
	threadNumber: Sequelize.INTEGER, // Used for discussions, to mark top-level discussion with a unique (per-pub, per published/unpublished) number
	// cloneParentPubId
	// cloneParentVersionId // Is cloneParentPubId needed if we are tracking clones by version?
	// rootReplyPubId
	// parentReplyPubId
	// pullRequestVersionId
	// licenseId
	// defaultContext
});

// How do files know their history?
// Do we need to encode parentFile and rootFile to track histories?
const File = sequelize.define('File', {
	type: { type: Sequelize.STRING },
	name: { type: Sequelize.STRING },
	path: { type: Sequelize.STRING },
	url: { type: Sequelize.TEXT },
	content: { type: Sequelize.TEXT },
	hash: { type: Sequelize.TEXT },
});

// How do versions know their history?
// Do we need to encode parentVersion and rootVersion to track histories?
const Version = sequelize.define('Version', {
	versionMessage: { type: Sequelize.TEXT },
	isPublished: { type: Sequelize.BOOLEAN },
	hash: { type: Sequelize.TEXT },
	// datePublished: { type: Sequelize.DATE }, // Don't need this, as the updated date has to be the publish date
	doi: { type: Sequelize.TEXT },
	defaultFile: Sequelize.TEXT,
	// exportPDF: { type: Sequelize.TEXT }, // TODO: Perhaps this is an external service for all of the exports. Maintains it's own cache, can iterate on its own. No dependency in the versions for old export styles
	// exportMarkdown: { type: Sequelize.TEXT },
	// exportXML: { type: Sequelize.TEXT },
	// exportHTML: { type: Sequelize.TEXT },
});

const Activity = sequelize.define('Activity', {
	verb: { type: Sequelize.TEXT },
	// actorJournalId
	// actorUserId
	// targetPubId
	// targetUserId
	// targetJournalId
	// targetLabelId
	// objectPubId
	// objectUserId
	// objectJournalId
	// objectLabelId
});

const License = sequelize.define('License', {
	title: { type: Sequelize.TEXT },
	description: { type: Sequelize.TEXT },
	url: { type: Sequelize.TEXT },
	image: { type: Sequelize.TEXT },
});

const Label = sequelize.define('Label', {
	title: { type: Sequelize.TEXT },
	color: { type: Sequelize.STRING },
	image: { type: Sequelize.TEXT },
	isDisplayed: { type: Sequelize.BOOLEAN }, // Used for some labels to mark whether they are rendered in special places, e.g. in a Journal's nav as collections
	// isPrivate: { type: Sequelize.BOOLEAN }, // Perhaps some labels could be private. If owned by a journal or user, they could be used to keep track of private organizations
	// journalId: journalId is used if a label is owned by a particular journal. These labels are used for collections
	// pubId: pubId is used to allow a pub to set it's own list of privately-editable labels for discussions.
	// userId: userId is used and private to a user to allow them to organize pubs that they follow
	// If there is no pubId and no journalId, it is a pubic label that can be used by anyone. These must be managed by the community.
});

const Role = sequelize.define('Role', {
	title: { type: Sequelize.TEXT },
});

const Highlight = sequelize.define('Highlight', {
	text: { type: Sequelize.TEXT },
	// userId: userId is used to mark who created the highlight
	// pubId: pubId is used to mark which pub the highlight is from
	// versionId: versionId is used to mark which version the highlight is from
	// versionHash: hash of the version the highlight is from
	// fileId
	// fileHash
	// fileName
});


const Journal = sequelize.define('Journal', {
	name: {
		type: Sequelize.TEXT,
		allowNull: false,
	},
	slug: { 
		type: Sequelize.TEXT, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
		},
	},
	shortDescription: { type: Sequelize.TEXT },
	longDescription: { type: Sequelize.TEXT },
	logo: { type: Sequelize.STRING },
	icon: Sequelize.STRING,
	website: Sequelize.STRING,
	twitter: Sequelize.STRING,
	facebook: Sequelize.STRING,
	headerColor: Sequelize.STRING,
	headerMode: Sequelize.STRING,
	headerAlign: Sequelize.STRING,
	headerImage: Sequelize.STRING,
	inactive: Sequelize.BOOLEAN,
});

const UserLastReadPub = sequelize.define('UserLastReadPub', {
	lastRead: { type: Sequelize.DATE },
});

const Contributor = sequelize.define('Contributor', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
	canEdit: Sequelize.BOOLEAN,
	canRead: Sequelize.BOOLEAN,
	isAuthor: Sequelize.BOOLEAN,
	isHidden: Sequelize.BOOLEAN, // Whether the contributor shows up on the 'Contributors' list. isAuthor=true forces isHidden false (or isHidden is ignored at least)
	inactive: Sequelize.BOOLEAN, // Used when a contributor is removed so we have a history of contributors and how they were applied/removed
});

const InvitedReviewer = sequelize.define('InvitedReviewer', {
	// email and name only used if not tied to an existing pubpub user
	email: { 
		type: Sequelize.TEXT,  
		validate: {
			isEmail: true
		} 
	},
	name: Sequelize.TEXT,
	invitationHash: Sequelize.TEXT, // Used to create the link that an invited email user can navigate to to create an account
	invitationAccepted: Sequelize.BOOLEAN,
	invitationRejected: Sequelize.BOOLEAN,
	rejectionReason: Sequelize.TEXT,
	// invitedUserId: used to mark which user has been invited
	// inviterUserId: used to mark which user created the invitiation
	// inviterJournalId: used to mark which journal the invitation is on behalf of
	// pubId: used to mark which pub they have been invited to.
});

const ApiKey = sequelize.define('ApiKey', {
	title: Sequelize.TEXT,
	keyId: Sequelize.TEXT,
	keySecret: Sequelize.TEXT,
	//userId: the associated user that this authenticates.
});

// Used on a Pub (typically a discussion pub)
const Reaction = sequelize.define('Reaction', {
	title: Sequelize.TEXT,
	keywords: Sequelize.TEXT,
	image: Sequelize.TEXT,
});

const JournalAdmin = sequelize.define('JournalAdmin', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
}); // Used to connect specific users to a specific journal as admin

const VersionFile = sequelize.define('VersionFile', {}); // Used to connect specific files to a specific version
const FileAttribution = sequelize.define('FileAttribution', {}); // Used to connect specific users to a specific file

const FollowsPub = sequelize.define('FollowsPub', {}); // Used to connect specific user to a specific pub as follower
const FollowsJournal = sequelize.define('FollowsJournal', {}); // Used to connect specific user to a specific journal as follower
const FollowsUser = sequelize.define('FollowsUser', {}); // Used to connect specific user to a specific user as follower
const FollowsLabel = sequelize.define('FollowsLabel', {}); // Used to connect specific user to a specific label as follower
	
const ContributorRole = sequelize.define('ContributorRole', {
	inactive: Sequelize.BOOLEAN, // Used when a contributor is removed so we have a history of contributors and how they were applied/removed
	// pubID: used so we can grab all roles when querying for pubs. Needed because we can't 'include' on a through table. Issue here: https://github.com/sequelize/sequelize/issues/5358
}); // Used to connect specific role to a specific contributor
const PubFeature = sequelize.define('PubFeature', { // Used to connect specific journal to specific pub as featurer
	isDisplayed: Sequelize.BOOLEAN, // Whether the feature tag is displayed on the front of the pub
	// isContext: Sequelize.BOOLEAN, // Whether the feature is the default context
});
const PubSubmit = sequelize.define('PubSubmit', {
	isRejected: Sequelize.BOOLEAN,
	isFeatured: Sequelize.BOOLEAN,
}); // Used to connect specific journal to specific pub as submit destination
const PubReaction = sequelize.define('PubReaction', {
	inactive: Sequelize.BOOLEAN, // Used when a reaction is removed so we have a history of reactions and how they were applied/removed
}); // Used to connect specific reaction to specific pub (typicaly discussion pub)
const PubLabel = sequelize.define('PubLabel', {
	inactive: Sequelize.BOOLEAN, // Used when a label is removed so we have a history of labels and how they were applied/removed
}); // Used to connect specific label to specific pub

const FileRelation = sequelize.define('FileRelation', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
	type: Sequelize.TEXT, // Used to describe the relationship between to files
}); // Used to connect specific file to specific file

// A user can be an author on many pubs, and a pub can have many authors
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'Contributor', foreignKey: 'userId' });
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'contributors', through: 'Contributor', foreignKey: 'pubId' });

// A pub can have many contributors, but a contributor belongs to only a single pub
Pub.hasMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', foreignKey: 'pubId' });
User.hasMany(Contributor, { onDelete: 'CASCADE', as: 'contributions', foreignKey: 'userId' });
// Roles can belong to many contributors, and contributors can have many roles
Contributor.belongsToMany(Role, { onDelete: 'CASCADE', as: 'roles', through: 'ContributorRole', foreignKey: 'contributorId' });
Role.belongsToMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', through: 'ContributorRole', foreignKey: 'roleId' });
// A contributor has a single user
Contributor.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
Contributor.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A file can be in many versions, and a version can have many files
File.belongsToMany(Version, { onDelete: 'CASCADE', as: 'versions', through: 'VersionFile', foreignKey: 'fileId' });
Version.belongsToMany(File, { onDelete: 'CASCADE', as: 'files', through: 'VersionFile', foreignKey: 'versionId' });

// A file can belong to a single pub, but a pub can have many files
Pub.hasMany(File, { onDelete: 'CASCADE', as: 'files', foreignKey: 'pubId' });

// A user can be attributed with many files, and a file may attribute many users
File.belongsToMany(User, { onDelete: 'CASCADE', as: 'attributions', through: 'FileAttribution', foreignKey: 'fileId' });
User.belongsToMany(File, { onDelete: 'CASCADE', as: 'files', through: 'FileAttribution', foreignKey: 'userId' });

// A version belongs to a single pub, but a pub can have many versions
Pub.hasMany(Version, { onDelete: 'CASCADE', as: 'versions', foreignKey: 'pubId' });

// A user can be an admin on many journals, and a journal can have many admins
User.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journals', through: 'JournalAdmin', foreignKey: 'userId' });
Journal.belongsToMany(User, { onDelete: 'CASCADE', as: 'admins', through: 'JournalAdmin', foreignKey: 'journalId' });

JournalAdmin.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
JournalAdmin.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
Journal.hasMany(JournalAdmin, { onDelete: 'CASCADE', as: 'admins', foreignKey: 'journalId' });
User.hasMany(JournalAdmin, { onDelete: 'CASCADE', as: 'journalAdmins', foreignKey: 'userId' });

// A user can follow many users, and a user can be followed by many users
User.belongsToMany(User, { onDelete: 'CASCADE', as: 'followsUsers', through: 'FollowsUser', foreignKey: 'followerId' });
User.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsUser', foreignKey: 'userId' });
FollowsUser.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsUser, { onDelete: 'CASCADE', as: 'FollowsUsers', foreignKey: 'followerId' });

// A user can follow many journals, and a journal can be followed by many users
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'followsPubs', through: 'FollowsPub', foreignKey: 'followerId' });
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsPub', foreignKey: 'pubId' });
FollowsPub.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsPub, { onDelete: 'CASCADE', as: 'FollowsPubs', foreignKey: 'followerId' });

// A user can follow many journals, and a journal can be followed by many users
User.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'followsJournals', through: 'FollowsJournal', foreignKey: 'followerId' });
Journal.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsJournal', foreignKey: 'journalId' });
FollowsJournal.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsJournal, { onDelete: 'CASCADE', as: 'FollowsJournals', foreignKey: 'followerId' });

// A user can follow many labels, and a label can be followed by many users
User.belongsToMany(Label, { onDelete: 'CASCADE', as: 'followsLabels', through: 'FollowsLabel', foreignKey: 'followerId' });
Label.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsLabel', foreignKey: 'labelId' });
FollowsLabel.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsLabel, { onDelete: 'CASCADE', as: 'FollowsLabels', foreignKey: 'followerId' });

// A pub can have many discussions, but a discussion belongs to only a single parent pub
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'discussions', foreignKey: 'replyRootPubId' });
Pub.belongsTo(Pub, { onDelete: 'CASCADE', as: 'replyRootPub', foreignKey: 'replyRootPubId' });
// A discussion can have many children, but only has a single parent
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'childDiscussions', foreignKey: 'replyParentPubId' });

// A journal can own many labels (used to build collections), but a label can have only one Journal
Journal.hasMany(Label, { onDelete: 'CASCADE', as: 'collections', foreignKey: 'journalId' });
// A user can have many labels, but a label can have only one User
User.hasMany(Label, { onDelete: 'CASCADE', as: 'userLabels', foreignKey: 'userId' });
// A pub can own many (custom discussion) labels, but a label can have only one Pub
Pub.hasMany(Label, { onDelete: 'CASCADE', as: 'pubLabels', foreignKey: 'pubId' });

// A Pub can have many Labels and a Label can apply to many pubs
Pub.belongsToMany(Label, { onDelete: 'CASCADE', as: 'labels', through: 'PubLabel', foreignKey: 'pubId' });
Label.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'PubLabel', foreignKey: 'labelId' });

// A Contributor can have many roles and a Role can be used for many contributors
// Role.belongsToMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', through: 'ContributorRole', foreignKey: 'roleId' });
// Contributor.belongsToMany(Role, { onDelete: 'CASCADE', as: 'roles', through: 'ContributorRole', foreignKey: 'contributorId' });
// Pub.hasMany(ContributorRole, { onDelete: 'CASCADE', as: 'contributorRoles', foreignKey: 'pubId' });
// ContributorRole.belongsTo(Role, { onDelete: 'CASCADE', as: 'role', foreignKey: 'roleId' });

// A Pub can be featured by many journals, and a Journal can feature many pubs
Pub.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journalsFeatured', through: 'PubFeature', foreignKey: 'pubId' });
Journal.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsFeatured', through: 'PubFeature', foreignKey: 'journalId' });
PubFeature.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
PubFeature.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
Pub.hasMany(PubFeature, { onDelete: 'CASCADE', as: 'pubFeatures', foreignKey: 'pubId' });
Journal.hasMany(PubFeature, { onDelete: 'CASCADE', as: 'pubFeatures', foreignKey: 'journalId' });

// A Pub can be submitted to many journals, and a Journal can have many submitted pubs
Pub.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journalsSubmitted', through: 'PubSubmit', foreignKey: 'pubId' });
Journal.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsSubmitted', through: 'PubSubmit', foreignKey: 'journalId' });
PubSubmit.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
PubSubmit.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
Pub.hasMany(PubSubmit, { onDelete: 'CASCADE', as: 'pubSubmits', foreignKey: 'pubId' });
Journal.hasMany(PubSubmit, { onDelete: 'CASCADE', as: 'pubSubmits', foreignKey: 'journalId' });

// A Pub can be lastRead by many users, and a User can have many lastRead dates for different pubs
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'usersRead', through: 'UserLastReadPub', foreignKey: 'pubId' });
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsRead', through: 'UserLastReadPub', foreignKey: 'userId' });

// A Pub can have many reactions, and a Reaction can be used on many Pubs.
// Pub.belongsToMany(Reaction, { onDelete: 'CASCADE', as: 'reactions', through: 'PubReaction', foreignKey: 'pubId' });
// Reaction.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'PubReaction', foreignKey: 'reactionId' });
// Reactions need to be tied to a user. We probably want to do something similar to how contributors is structured
PubReaction.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
PubReaction.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
PubReaction.belongsTo(Reaction, { onDelete: 'CASCADE', as: 'reaction', foreignKey: 'reactionId' });
Pub.hasMany(PubReaction, { onDelete: 'CASCADE', as: 'pubReactions', foreignKey: 'pubId' });


// A File can be related to many other files
File.belongsToMany(File, { onDelete: 'CASCADE', as: 'destinations', through: 'FileRelation', foreignKey: 'sourceFileId' });
File.belongsToMany(File, { onDelete: 'CASCADE', as: 'sources', through: 'FileRelation', foreignKey: 'destinationFileId' });

// A pub can have many highlights, but a highlight belongs to only a single pub
Pub.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'pubId' });
// A version can have many highlights, but a highlight belongs to only a single version
Version.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'versionId' });
// A user can have many highlights, but a highlight belongs to only a single user
User.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'userId' });

// A license can be used on many pubs, but a pub belongs to only a single license
License.hasMany(Pub, { onDelete: 'CASCADE', as: 'pubs', foreignKey: 'licenseId' });
// A pub can have one license
Pub.belongsTo(License, { onDelete: 'CASCADE', as: 'license', foreignKey: 'licenseId' });

// A pub can have one default context
Pub.belongsTo(Journal, { onDelete: 'CASCADE', as: 'defaultContextJournal', foreignKey: 'defaultContext' });

// A pub can have many clones, but a clone belongs to only a single parent pub
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'clones', foreignKey: 'cloneParentPubId' });
Pub.belongsTo(Pub, { onDelete: 'CASCADE', as: 'cloneParent', foreignKey: 'cloneParentPubId' });

// TODO: These were causing cyclic dependency issues. Find the right structure for what a clone/pr is.
// A version can have many clones, but a clone belongs to only a single parent version
// Version.hasMany(Pub, { onDelete: 'CASCADE', as: 'clones', foreignKey: 'cloneParentVersionId' });
// A discussion Pub can have a single PR
// Pub.belongsTo(Version, { onDelete: 'CASCADE', as: 'pullRequest', foreignKey: 'pullRequestVersionId' });

// A pub can have many invited reviewers, but an invited reviewer belongs to only a single pub
Pub.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitedReviewers', foreignKey: 'pubId' });

// A user can be an invited as a reviewer many times, but a review invitation can only have a single user
User.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitations', foreignKey: 'invitedUserId' });
InvitedReviewer.belongsTo(User, { onDelete: 'CASCADE', as: 'invitedUser', foreignKey: 'invitedUserId' });

// A user can be an the invitor many times, but a review invitation can only have a single inviter
User.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitationsCreated', foreignKey: 'inviterUserId' });
InvitedReviewer.belongsTo(User, { onDelete: 'CASCADE', as: 'inviterUser', foreignKey: 'inviterUserId' });

// A journal can be an the invitor many times, but a review invitation can only have a single journal
Journal.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitationsCreated', foreignKey: 'inviterJournalId' });
InvitedReviewer.belongsTo(Journal, { onDelete: 'CASCADE', as: 'inviterJournal', foreignKey: 'inviterJournalId' });

// A user can have many apiKeys, but a key belongs to only a single user
User.hasMany(ApiKey, { onDelete: 'CASCADE', as: 'apiKeys', foreignKey: 'userId' });

// An activity can have a single User or Journal as the actor. No realuse for Pub or Label actors yet, but added for consistency
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'actorPub', foreignKey: 'actorPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'actorUser', foreignKey: 'actorUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'actorJournal', foreignKey: 'actorJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'actorLabel', foreignKey: 'actorLabelId' });
// An activity can have a single Pub, User, Journal, or Label as the target
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'targetPub', foreignKey: 'targetPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'targetUser', foreignKey: 'targetUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'targetJournal', foreignKey: 'targetJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'targetLabel', foreignKey: 'targetLabelId' });
// An activity can have a single Pub, User, Journal, or Label as the object
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'objectPub', foreignKey: 'objectPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'objectUser', foreignKey: 'objectUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'objectJournal', foreignKey: 'objectJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'objectLabel', foreignKey: 'objectLabelId' });

const db = {
	SignUp: SignUp,
	User: User,
	Pub: Pub,
	File: File,
	Version: Version,
	Reaction: Reaction,
	Label: Label,
	Role: Role,
	Highlight: Highlight,
	Journal: Journal,
	JournalAdmin: JournalAdmin,
	ApiKey: ApiKey,
	License: License,
	UserLastReadPub: UserLastReadPub,
	Contributor: Contributor,
	VersionFile: VersionFile,
	FileAttribution: FileAttribution,
	FollowsPub: FollowsPub,
	FollowsJournal: FollowsJournal,
	FollowsUser: FollowsUser,
	FollowsLabel: FollowsLabel,
	ContributorRole: ContributorRole,
	PubFeature: PubFeature,
	PubSubmit: PubSubmit,
	PubLabel: PubLabel,
	PubReaction: PubReaction,
	FileRelation: FileRelation,
	InvitedReviewer: InvitedReviewer,
	Activity: Activity,
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
