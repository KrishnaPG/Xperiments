const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const { LocalStrategy } = require('@feathersjs/authentication-local');
const { expressOauth, OAuthStrategy } = require('@feathersjs/authentication-oauth');
const { NotAcceptable } = require('@feathersjs/errors');

class GitHubStrategy extends OAuthStrategy {
	async getEntityData(profile) {
		const baseData = await super.getEntityData(profile); console.log("profile: ", profile);

		if (!profile.email) throw new NotAcceptable(`Github oAuth did not return an eMail address`);

		return {
			...baseData,
			email: profile.email
		};
	}
	async authenticate(authentication, params) {
		console.log("authenticate: ", authentication, " \n params: ", params);
		const result = await super.authenticate(authentication, params);
		return result;
	}
}

class GoogleStrategy extends OAuthStrategy {
	async getEntityData(profile) {
		const baseData = await super.getEntityData(profile);

		return {
			...baseData,
			email: profile.email
		};
	}
	// async getRedirect(data) {
	// 	const retVal = await super.getRedirect(data);
	// 	console.log("get redirect: ", data, " result: ", retVal);
	// }
}

module.exports = app => {
	const authentication = new AuthenticationService(app);

	authentication.register('jwt', new JWTStrategy());
	authentication.register('local', new LocalStrategy());
	authentication.register('github', new GitHubStrategy());
	authentication.register('google', new GoogleStrategy());

	app.use('/authentication', authentication);
	app.configure(expressOauth());
};
