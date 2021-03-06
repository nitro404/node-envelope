"use strict";

const request = require("request");
const utilities = require("extra-utilities");

const envelope = { };

const validMethods = ["HEAD", "GET", "POST", "PUT", "PATCH", "DELETE"];

const defaultOptions = {
	baseUrl: null,
	authorization: null,
	timeout: 30000
};

envelope.hasBaseUrl = function() {
	return utilities.isNonEmptyString(defaultOptions.baseUrl);
};

envelope.getBaseUrl = function() {
	return defaultOptions.baseUrl;
};

envelope.setBaseUrl = function(url) {
	if(utilities.isEmptyString(url)) {
		return;
	}

	defaultOptions.baseUrl = url;
};

envelope.clearBaseUrl = function() {
	defaultOptions.baseUrl = null;
};

envelope.hasAuthorization = function() {
	return utilities.isNonEmptyString(defaultOptions.authorization);
};

envelope.getAuthorization = function() {
	return defaultOptions.authorization;
};

envelope.setAuthorizationToken = function(token) {
	if(utilities.isEmptyString(token)) { return; }

	defaultOptions.authorization = token;
};

envelope.setBasicAuthorization = function(userName, password) {
	if(utilities.isEmptyString(userName) || utilities.isEmptyString(password)) { return; }

	defaultOptions.authorization = "Basic " + Buffer.from(userName + ":" + password).toString("base64");
};

envelope.clearAuthorization = function() {
	defaultOptions.authorization = null;
};

envelope.hasTimeout = function() {
	return utilities.isValid(defaultOptions.timeout);
};

envelope.getTimeout = function() {
	return defaultOptions.timeout;
};

envelope.setTimeout = function(timeout) {
	const formattedTimeout = utilities.parseInteger(timeout);

	if(utilities.isInvalidNumber(formattedTimeout) || formattedTimeout < 1) {
		return;
	}

	defaultOptions.timeout = formattedTimeout;
};

envelope.clearTimeout = function() {
	defaultOptions.timeout = null;
};

envelope.request = function(method, path, data, query, options, callback) {
	if(utilities.isFunction(data)) {
		callback = data;
		options = null;
		query = null;
		data = null;
	}
	else if(utilities.isFunction(query)) {
		callback = query;
		options = null;
		query = null;
	}
	else if(utilities.isFunction(options)) {
		callback = options;
		options = null;
	}

	if(!utilities.isFunction(callback)) {
		throw new Error("Missing or invalid callback function!");
	}

	if(utilities.isEmptyString(method)) {
		const error = new Error("Missing or invalid method type.");
		error.type = "request";
		error.code = "invalid_method";
		return callback(error, null, null);
	}

	let formattedMethod = method.toUpperCase().trim();
	const isUpload = formattedMethod === "UPLOAD";

	if(isUpload) {
		formattedMethod = "POST";
	}

	let validMethod = false;

	for(let i = 0; i < validMethods.length; i++) {
		if(formattedMethod === validMethods[i]) {
			validMethod = true;
			break;
		}
	}

	if(!validMethod) {
		const error = new Error("Unsupported method type: \"" + formattedMethod + "\" - expected one of: " + validMethods.join(", ") + ".");
		error.type = "request";
		error.code = "unsupported_method";
		return callback(error, null, null);
	}

	const hasBody = formattedMethod === "POST" ||
				  formattedMethod === "PUT" ||
				  formattedMethod === "PATCH";

	if(utilities.isValid(data) && !hasBody) {
		options = query;
		query = data;
		data = null;
	}

	const newOptions = utilities.isObjectStrict(options) ? utilities.clone(options) : { };
	newOptions.method = formattedMethod;
	newOptions.json = true;

	if(newOptions.timeout !== null && !Number.isInteger(newOptions.timeout)) {
		newOptions.timeout = defaultOptions.timeout;
	}

	if(utilities.isInvalid(newOptions.timeout)) {
		delete newOptions.timeout;
	}

	if(utilities.isEmptyString(newOptions.baseUrl) && utilities.isNonEmptyString(defaultOptions.baseUrl)) {
		newOptions.baseUrl = defaultOptions.baseUrl;
	}

	newOptions.url = path;

	if(utilities.isObject(query)) {
		newOptions.qs = query;
	}

	if(hasBody && utilities.isValid(data)) {
		newOptions.body = data;
	}

	if(!utilities.isObject(newOptions.headers)) {
		newOptions.headers = { };
	}

	if(isUpload) {
		newOptions.headers["Content-Type"] = undefined;
	}
	else if(utilities.isEmptyString(newOptions.headers["Content-Type"])) {
		newOptions.headers["Content-Type"] = "application/json";
	}

	if(utilities.isEmptyString(newOptions.headers.Accepts)) {
		newOptions.headers.Accepts = "application/json";
	}

	if(utilities.isValid(newOptions.authorization)) {
		if(utilities.isNonEmptyString(newOptions.authorization)) {
			if(utilities.isNonEmptyString(newOptions.headers.Authorization)) {
				console.error("Authorization specified in header data is being overridden by authorization at root level of options.");
			}

			newOptions.headers.Authorization = newOptions.authorization;
		}

		delete newOptions.authorization;
	}

	if(utilities.isEmptyString(newOptions.headers.Authorization)) {
		if(utilities.isNonEmptyString(defaultOptions.authorization)) {
			newOptions.headers.Authorization = defaultOptions.authorization;
		}
	}

	newOptions.callback = function(error, response, body) {
		if(body === undefined) {
			body = null;
		}

		if(response === undefined) {
			response = null;
		}

		if(utilities.isObject(error)) {
			error.type = "server";
			return callback(error, body, response);
		}

		if(utilities.isObject(body)) {
			if(response.statusCode >= 400 && response.statusCode < 600) {
				if(utilities.isValid(body.error)) {
					const formattedError = utilities.createError(utilities.isObject(body.error) ? body.error.message : body.error, response.statusCode);
					formattedError.type = "remote";
					return callback(formattedError, null, response);
				}

				const formattedError = utilities.createError(utilities.isNonEmptyString(body.message) ? body.message : JSON.stringify(body), response.statusCode);
				formattedError.type = "remote";
				return callback(formattedError, null, response);
			}
		}

		return callback(null, body, response);
	};

	return request(newOptions);
};

envelope.head = function(path, data, query, options, callback) {
	return envelope.request("HEAD", path, data, query, options, callback);
};

envelope.get = function(path, data, query, options, callback) {
	return envelope.request("GET", path, data, query, options, callback);
};

envelope.post = function(path, data, query, options, callback) {
	return envelope.request("POST", path, data, query, options, callback);
};

envelope.put = function(path, data, query, options, callback) {
	return envelope.request("PUT", path, data, query, options, callback);
};

envelope.patch = function(path, data, query, options, callback) {
	return envelope.request("PATCH", path, data, query, options, callback);
};

envelope.delete = function(path, data, query, options, callback) {
	return envelope.request("DELETE", path, data, query, options, callback);
};

envelope.upload = function(path, data, query, options, file, callback) {
	const fileDescriptor = new FormData();

	if(utilities.isValid(file)) {
		fileDescriptor.append("file", file);
	}

	if(utilities.isObjectStrict(data)) {
		for(let attribute in data) {
			if(attribute === "file") {
				continue;
			}

			fileDescriptor.append(attribute, data[attribute]);
		}
	}

	return envelope.request("UPLOAD", path, fileDescriptor, query, options, callback);
};

module.exports = envelope;
