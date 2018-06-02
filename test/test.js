"use strict";

global.utilities = undefined;

var envelope = require("../dist/envelope.js");
var async = require("async");
var utilities = require("extra-utilities");
var chai = require("chai");
var expect = chai.expect;
var express = require("express");
var app = express();
var router = express.Router();
var bodyParser = require("body-parser");

var server = null;
var port = 7357;
var apiAddress = "http://127.0.0.1:" + port;
var idCounter = 0;
var albums = [];

var basicCredentials = {
	userName: "fake",
	password: "news"
};

var basicAuthorization = "Basic " + Buffer.from(basicCredentials.userName + ":" + basicCredentials.password).toString("base64");

var albumFormat = {
	type: "object",
	strict: true,
	removeExtra: true,
	autopopulate: true,
	nonEmpty: true,
	order: true,
	required: true,
	format: {
		id: {
			type: "integer",
			parser: function(value, format, options) {
				return idCounter++;
			}
		},
		artist: {
			type: "string",
			trim: true,
			nonEmpty: true,
			required: true
		},
		album: {
			type: "string",
			case: "title",
			trim: true,
			nonEmpty: true,
			required: true
		},
		year: {
			type: "integer",
			required: true,
			validator: function(value, format, options) {
				return value > 0;
			}
		},
		genre: {
			type: "string",
			case: "title",
			trim: true,
			nonEmpty: true,
			default: "Unknown"
		}
	}
};

var patchAlbumFormat = utilities.clone(albumFormat);
delete patchAlbumFormat.required;
delete patchAlbumFormat.format.id;
delete patchAlbumFormat.format.artist.required;
delete patchAlbumFormat.format.album.required;
delete patchAlbumFormat.format.year.required;

app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));
app.use(bodyParser.urlencoded({ extended: true }));

router.head("/:id", function(req, res, next) {
	var albumId = utilities.parseInteger(req.params.id);

	if(!Number.isInteger(albumId)) {
		return res.status(400).json({ message: "Empty or invalid album id." });
	}

	var albumIndex = -1;

	for(var i = 0; i < albums.length; i++) {
		if(albums[i].id === albumId) {
			albumIndex = i;
			break;
		}
	}

	return res.status(albumIndex === -1 ? 404 : 200).json();
});

router.get("/", function(req, res, next) {
	return res.json(albums);
});

router.get("/:id", function(req, res, next) {
	var albumId = utilities.parseInteger(req.params.id);

	if(!Number.isInteger(albumId)) {
		return status(400).json({ message: "Empty or invalid album id." });
	}

	return res.json(albums.find(function(album) {
		return album.id === albumId;
	}));
});

router.post("/", function(req, res, next) {
	var formattedAlbum = null;

	try {
		formattedAlbum = utilities.formatValue(req.body, albumFormat, { throwErrors: true, verbose: false });
	}
	catch(error) {
		return status(400).json(error);
	}

	albums.push(formattedAlbum);

	return res.json(formattedAlbum);
});

router.put("/:id", function(req, res, next) {
	var albumId = utilities.parseInteger(req.params.id);

	if(!Number.isInteger(albumId)) {
		return status(400).json({ message: "Empty or invalid album id." });
	}

	var albumIndex = -1;

	for(var i = 0; i < albums.length; i++) {
		if(albums[i].id === albumId) {
			albumIndex = i;
			break;
		}
	}

	if(albumIndex === -1) {
		return status(404).json({ message: "Album with id " + albumId + "not found." });
	}

	try {
		formattedAlbum = utilities.formatValue(req.body, albumFormat, { throwErrors: true, verbose: false });
		formattedAlbum.id = albumId;
	}
	catch(error) {
		return status(400).json(error);
	}

	albums[albumIndex] = formattedAlbum;

	return res.json(formattedAlbum);
});

router.patch("/:id", function(req, res, next) {
	var albumId = utilities.parseInteger(req.params.id);

	if(!Number.isInteger(albumId)) {
		return status(400).json({ message: "Empty or invalid album id." });
	}

	var albumIndex = -1;

	for(var i = 0; i < albums.length; i++) {
		if(albums[i].id === albumId) {
			albumIndex = i;
			break;
		}
	}

	if(albumIndex === -1) {
		return status(404).json({ message: "Album with id " + albumId + "not found." });
	}

	try {
		formattedAlbum = utilities.formatValue(req.body, patchAlbumFormat, { throwErrors: true, verbose: false });
		formattedAlbum.id = albumId;
	}
	catch(error) {
		return status(400).json(error);
	}

	utilities.merge(albums[albumIndex], formattedAlbum, false);

	return res.json(albums[albumIndex]);
});

router.delete("/:id", function(req, res, next) {
	var albumId = utilities.parseInteger(req.params.id);

	if(!Number.isInteger(albumId)) {
		return status(400).json({ message: "Empty or invalid album id." });
	}

	var count = 0;

	for(var i = 0; i < albums.length; i++) {
		if(albums[i].id == albumId) {
			albums.splice(i, 1);
			count++;
			break;
		}
	}

	return res.json({
		count: count
	});
});

app.use("/albums", router);

app.get("/test", function(req, res, next) {
	return res.json({ nice: "meme" });
});

app.get("/nice/meme", function(req, res, next) {
	return res.json({ surprise: "ketchup" });
});

app.get("/auth", function(req, res, next) {
	if(req.headers["authorization"] !== "pls") {
		return res.status(401).json();
	}

	return res.json({ ok: "fine" });
});

app.get("/basic", function(req, res, next) {
	if(req.headers["authorization"] !== basicAuthorization) {
		return res.status(401).json();
	}

	return res.json({ no: "thx" });
});

app.get("/real-error", function(req, res, next) {
	return res.status(500).send({ message: "y u do dis" });
});

app.get("/fake-error", function(req, res, next) {
	return res.status(456).json({ error: { message: "lies" } });
});

app.get("/basic-error", function(req, res, next) {
	return res.status(567).json({ error: "dumb" });
});

app.get("/bad-error", function(req, res, next) {
	return res.status(420).json({ u: "wot" });
});

app.get("/no-response", function(req, res, next) { });

app.use(function(req, res, next) {
	return res.status(404).json({ message: "Not Found" });
});

describe("Envelope", function() {
	before(function(callback) {
		server = app.listen(port, function() {
			return callback();
		});
	});

	beforeEach(function() {
		idCounter = 0;
		albums.length = 0;

		envelope.clearBaseUrl();
		envelope.clearAuthorization();
		envelope.clearTimeout();
	});

	describe("getBaseUrl", function() {
		it("should be a function", function() {
			expect(envelope.getBaseUrl instanceof Function).to.equal(true);
		});

		it("should return true if the default base url is set", function() {
			var baseUrl = "https://api.discogs.com";

			expect(envelope.hasBaseUrl()).to.equal(false);

			envelope.setBaseUrl(baseUrl);

			expect(envelope.hasBaseUrl()).to.equal(true);
		});
	});

	describe("getBaseUrl", function() {
		it("should be a function", function() {
			expect(envelope.getBaseUrl instanceof Function).to.equal(true);
		});

		it("should return the default base url value", function() {
			var baseUrl = "https://api.discogs.com";

			expect(envelope.getBaseUrl()).to.not.equal(baseUrl);

			envelope.setBaseUrl(baseUrl);

			expect(envelope.getBaseUrl()).to.equal(baseUrl);
		});
	});

	describe("setBaseUrl", function() {
		it("should be a function", function() {
			expect(envelope.setBaseUrl instanceof Function).to.equal(true);
		});

		it("should set the default base url value", function() {
			var baseUrl = "http://musicbrainz.org/ws/2";

			expect(envelope.getBaseUrl()).to.not.equal(baseUrl);

			envelope.setBaseUrl(baseUrl);

			expect(envelope.getBaseUrl()).to.equal(baseUrl);
		});

		it("should not change the default base url if the value is invalid", function() {
			var baseUrl = "http://api.steampowered.com";

			expect(envelope.getBaseUrl()).to.not.equal(baseUrl);

			envelope.setBaseUrl(baseUrl);

			expect(envelope.getBaseUrl()).to.equal(baseUrl);

			envelope.setBaseUrl(-Infinity);

			expect(envelope.getBaseUrl()).to.equal(baseUrl);
		});
	});

	describe("clearBaseUrl", function() {
		it("should be a function", function() {
			expect(envelope.clearBaseUrl instanceof Function).to.equal(true);
		});

		it("should clear the default base url", function() {
			var baseUrl = "https://api.octranspo1.com/v1.2";

			expect(envelope.getBaseUrl()).to.not.equal(baseUrl);

			envelope.setBaseUrl(baseUrl);

			expect(envelope.getBaseUrl()).to.equal(baseUrl);

			envelope.clearBaseUrl();

			expect(envelope.getBaseUrl()).to.equal(null);
		});
	});

	describe("hasAuthorization", function() {
		it("should be a function", function() {
			expect(envelope.hasAuthorization instanceof Function).to.equal(true);
		});

		it("should return true only if the default authorization token is set", function() {
			var authorization = "nicememe420";

			expect(envelope.hasAuthorization()).to.equal(false);

			envelope.setAuthorizationToken(authorization);

			expect(envelope.hasAuthorization()).to.equal(true);
		});
	});

	describe("getAuthorization", function() {
		it("should be a function", function() {
			expect(envelope.getAuthorization instanceof Function).to.equal(true);
		});

		it("should return the default authorization token", function() {
			var authorization = "nicememe420";

			expect(envelope.getAuthorization()).to.not.equal(authorization);

			envelope.setAuthorizationToken(authorization);

			expect(envelope.getAuthorization()).to.equal(authorization);
		});
	});

	describe("setAuthorizationToken", function() {
		it("should be a function", function() {
			expect(envelope.setAuthorizationToken instanceof Function).to.equal(true);
		});

		it("should set a simple default authorization token", function() {
			var authorization = "dankmemes69";

			expect(envelope.getAuthorization()).to.not.equal(authorization);

			envelope.setAuthorizationToken(authorization);

			expect(envelope.getAuthorization()).to.equal(authorization);
		});

		it("should not change the default authorization token if the value is invalid", function() {
			var authorization = "surprise-ketchup";

			expect(envelope.getAuthorization()).to.not.equal(authorization);

			envelope.setAuthorizationToken(authorization);

			expect(envelope.getAuthorization()).to.equal(authorization);

			envelope.setAuthorizationToken(new Date());

			expect(envelope.getAuthorization()).to.equal(authorization);
		});
	});

	describe("setBasicAuthorization", function() {
		it("should be a function", function() {
			expect(envelope.setBasicAuthorization instanceof Function).to.equal(true);
		});

		it("should set a default authorization token using basic authentication credentials", function() {
			var credentials = {
				userName: "nitro404",
				password: "ayylmao7331"
			};

			var authToken = "Basic " + Buffer.from(credentials.userName + ":" + credentials.password).toString("base64");

			expect(envelope.getAuthorization()).to.not.equal(authToken);

			envelope.setBasicAuthorization(credentials.userName, credentials.password);

			expect(envelope.getAuthorization()).to.equal(authToken);
		});

		it("should not change the default authorization token if the credentials are invalid", function() {
			var credentials = {
				userName: "nitro404",
				password: "ayylmao7331"
			};

			var authToken = "Basic " + Buffer.from(credentials.userName + ":" + credentials.password).toString("base64");

			expect(envelope.getAuthorization()).to.not.equal(authToken);

			envelope.setBasicAuthorization(credentials.userName, credentials.password);

			expect(envelope.getAuthorization()).to.equal(authToken);

			envelope.setBasicAuthorization(credentials.userName, new Error("Fake news!"));

			expect(envelope.getAuthorization()).to.equal(authToken);

			envelope.setBasicAuthorization(NaN, credentials.password);

			expect(envelope.getAuthorization()).to.equal(authToken);
		});
	});

	describe("clearAuthorization", function() {
		it("should be a function", function() {
			expect(envelope.clearAuthorization instanceof Function).to.equal(true);
		});

		it("should clear the default authorization token", function() {
			var authorization = "super_secret";

			var credentials = {
				userName: "noscopemaster",
				password: "123456"
			};

			expect(envelope.hasAuthorization()).to.equal(false);

			envelope.setAuthorizationToken(authorization);

			expect(envelope.hasAuthorization()).to.equal(true);

			envelope.clearAuthorization();

			expect(envelope.hasAuthorization()).to.equal(false);

			envelope.setBasicAuthorization(credentials.userName, credentials.password);

			expect(envelope.hasAuthorization()).to.equal(true);

			envelope.clearAuthorization();

			expect(envelope.hasAuthorization()).to.equal(false);
		});
	});

	describe("hasTimeout", function() {
		it("should be a function", function() {
			expect(envelope.hasTimeout instanceof Function).to.equal(true);
		});

		it("should return true if the default timeout is set", function() {
			var timeout = 1;

			expect(envelope.hasTimeout()).to.equal(false);

			envelope.setTimeout(timeout);

			expect(envelope.hasTimeout()).to.equal(true);
		});
	});

	describe("getTimeout", function() {
		it("should be a function", function() {
			expect(envelope.getTimeout instanceof Function).to.equal(true);
		});

		it("should return the default timeout value", function() {
			var timeout = 9001;

			expect(envelope.getTimeout()).to.equal(null);

			envelope.setTimeout(timeout);

			expect(envelope.getTimeout()).to.equal(9001);
		});
	});

	describe("setTimeout", function() {
		it("should be a function", function() {
			expect(envelope.setTimeout instanceof Function).to.equal(true);
		});

		it("should set the default timeout value", function() {
			var timeout = 1337;

			expect(envelope.getTimeout()).to.equal(null);

			envelope.setTimeout(timeout);

			expect(envelope.getTimeout()).to.equal(1337);
		});

		it("should not change the default timeout if the value is invalid", function() {
			var timeout = 161;

			expect(envelope.getTimeout()).to.equal(null);

			envelope.setTimeout(timeout);

			expect(envelope.getTimeout()).to.equal(161);

			envelope.setTimeout(NaN);

			expect(envelope.getTimeout()).to.equal(161);
		});
	});

	describe("request", function() {
		it("should be a function", function() {
			expect(envelope.request instanceof Function).to.equal(true);
		});

		it("should throw an error if no callback function is specified", function() {
			var thrownError = null;

			try { envelope.request(); }
			catch(error) { thrownError = error; }

			expect(thrownError).to.not.equal(null);
			expect(thrownError.message).to.equal("Missing or invalid callback function!");
		});

		it("should return an error for invalid request method types", function(callback) {
			envelope.request([], "", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("Missing or invalid method type.");
				expect(error.type).to.equal("request");
				expect(error.code).to.equal("invalid_method");
				expect(data).to.equal(null);
				expect(response).to.equal(null);

				return callback();
			});
		});

		it("should return an error for unsupported request method types", function(callback) {
			envelope.request("BUTTS", "", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("Unsupported method type: \"BUTTS\" - expected one of: HEAD, GET, POST, PUT, PATCH, DELETE.");
				expect(error.type).to.equal("request");
				expect(error.code).to.equal("unsupported_method");
				expect(data).to.equal(null);
				expect(response).to.equal(null);

				return callback();
			});
		});

		it("should reorganize arguments if the callback is in a different location", function(callback) {
			var result = {
				nice: "meme"
			};

			envelope.setBaseUrl(apiAddress);

			return async.waterfall(
				[
					function(callback) {
						return envelope.request("get", "test", function(error, data, response) {
							expect(error).to.equal(null);
							expect(data).to.deep.equal(result);
							expect(response).to.not.equal(null);

							return callback();
						});
					},
					function(callback) {
						return envelope.request("get", "test", { dank: true }, function(error, data, response) {
							expect(error).to.equal(null);
							expect(data).to.deep.equal(result);
							expect(response).to.not.equal(null);

							return callback();
						});
					},
					function(callback) {
						return envelope.request("get", "test", { dank: true }, { timeout: 8999 }, function(error, data, response) {
							expect(error).to.equal(null);
							expect(data).to.deep.equal(result);
							expect(response).to.not.equal(null);

							return callback();
						});
					}
				],
				function(error) {
					expect(utilities.isInvalid(error)).to.equal(true)

					return callback();
				}
			);
		});

		it("should allow for custom headers to be set in options", function(callback) {
			var result = {
				nice: "meme"
			};

			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "test", null, null, { headers: { "Content-Type": "application/xml", "Accepts": "application/xml" } }, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(200);
				expect(data).to.deep.equal(result);

				return callback();
			});
		});

		it("should use the default authorization token when specified", function(callback) {
			var result = {
				ok: "fine"
			};

			envelope.setBaseUrl(apiAddress);
			envelope.setAuthorizationToken("pls");

			return envelope.request("get", "auth", null, null, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(200);
				expect(data).to.deep.equal(result);

				return callback();
			});
		});

		it("should allow for authorization tokens to be set in options", function(callback) {
			var result = {
				ok: "fine"
			};

			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "auth", null, null, { authorization: "pls" }, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(200);
				expect(data).to.deep.equal(result);

				return callback();
			});
		});

		it("should use the default basic authorization credentials when specified", function(callback) {
			var result = {
				no: "thx"
			};

			envelope.setBaseUrl(apiAddress);
			envelope.setBasicAuthorization(basicCredentials.userName, basicCredentials.password);

			return envelope.request("get", "basic", null, null, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(200);
				expect(data).to.deep.equal(result);

				return callback();
			});
		});

		it("should not use invalid authorization tokens when specified in the options", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "basic", null, null, { authorization: "\t" }, function(error, data, response) {
				expect(error).to.equal(null);
				expect(data).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(401);

				return callback();
			});
		});

		it("should use the authorization token in the options instead of the headers when both are specified", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "auth", null, null, { authorization: "beg", headers: { "Authorization": "pls" } }, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(401);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should allow for the default base url to be overridden in the options headers", function(callback) {
			var result = {
				surprise: "ketchup"
			};

			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "meme", null, null, { baseUrl: utilities.joinPaths(apiAddress, "nice") }, function(error, data, response) {
				expect(error).to.equal(null);
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(200);
				expect(data).to.deep.equal(result);

				return callback();
			});
		});

		it("should handle errors returned by the server", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "real-error", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("y u do dis");
				expect(error.type).to.equal("remote");
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(500);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should handle errors that are accidentally returned as objects", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "fake-error", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("lies");
				expect(error.type).to.equal("remote");
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(456);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should handle errors that are accidentally returned as strings", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "basic-error", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("dumb");
				expect(error.type).to.equal("remote");
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(567);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should handle errors that do not contain a message attribute", function(callback) {
			envelope.setBaseUrl(apiAddress);

			return envelope.request("get", "bad-error", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.message).to.equal("{\"u\":\"wot\"}");
				expect(error.type).to.equal("remote");
				expect(response).to.not.equal(null);
				expect(response.statusCode).to.equal(420);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should handle connection errors for invalid server ports", function(callback) {
			envelope.setBaseUrl("http://127.0.0.1:73572");

			return envelope.request("get", "test", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error instanceof Error).to.equal(true);
				expect(error.type).to.equal("server");
				expect(response).to.equal(null);
				expect(data).to.equal(null);

				return callback();
			});
		});

		it("should time out requests that take longer than a specified amount of time", function(callback) {
			var expectedDuration = 1337;

			envelope.setBaseUrl(apiAddress);
			envelope.setTimeout(expectedDuration);

			var startTime = new Date();

			return envelope.request("get", "no-response", function(error, data, response) {
				expect(error).to.not.equal(null);
				expect(error.type).to.equal("server");
				expect(response).to.equal(null);
				expect(data).to.equal(null)

				var duration = utilities.compareDates(new Date(), startTime);

				expect(duration > expectedDuration - 100 && duration < expectedDuration + 100).to.equal(true);

				return callback();
			});
		});
	});

	describe("head", function() {
		it("should be a function", function() {
			expect(envelope.head instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			albums.push({
				id: 7,
				artist: "Derma-Tek",
				album: "Corpus Technological",
				year: 2006
			});

			albums.push({
				id: 8,
				artist: "Mechanical Moth",
				album: "Torment",
				year: 2005
			});

			return envelope.head("albums/8", null, null, { baseUrl: apiAddress }, function(error, data, response) {
				expect(error).to.equal(null);

				expect(response.statusCode).to.equal(200);

				expect(data).to.equal(null);

				return callback();
			});
		});
	});

	describe("get", function() {
		it("should be a function", function() {
			expect(envelope.get instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			albums.push({
				id: 4,
				artist: "The Crystal Method",
				album: "Tweekend",
				year: 2001
			});

			return envelope.get("albums", null, null, { baseUrl: apiAddress }, function(error, data, response) {
				expect(error).to.equal(null);

				expect(response.statusCode).to.equal(200);

				expect(data).to.deep.equal([
					{
						id: 4,
						artist: "The Crystal Method",
						album: "Tweekend",
						year: 2001
					}
				]);

				return callback();
			});
		});
	});

	describe("post", function() {
		it("should be a function", function() {
			expect(envelope.post instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			return envelope.post(
				"albums",
				{
					artist: "Flamingosis",
					year: "2017",
					album: "A GROOVY THING"
				},
				null,
				{
					baseUrl: apiAddress
				},
				function(error, data, response) {
					expect(error).to.equal(null);

					expect(response.statusCode).to.equal(200);

					expect(data).to.deep.equal({
						id: 0,
						artist: "Flamingosis",
						album: "A Groovy Thing",
						year: 2017,
						genre: "Unknown"
					});

					expect(albums).to.deep.equal([
						{
							id: 0,
							artist: "Flamingosis",
							album: "A Groovy Thing",
							year: 2017,
							genre: "Unknown"
						}
					]);

					return callback();
				}
			);
		});
	});

	describe("put", function() {
		it("should be a function", function() {
			expect(envelope.put instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			albums.push({
				id: 3,
				artist: "W.A.S.T.E.",
				album: "Warlord Mentality",
				year: 2014,
				genre: "Rhythmic Power Noise"
			});

			return envelope.put(
				"albums/3",
				{
					artist: "Terrorfakt",
					album: "Teethgrinder",
					year: 2006
				},
				null,
				{
					baseUrl: apiAddress
				},
				function(error, data, response) {
					expect(error).to.equal(null);

					expect(response.statusCode).to.equal(200);

					expect(data).to.deep.equal({
						id: 3,
						artist: "Terrorfakt",
						album: "Teethgrinder",
						year: 2006,
						genre: "Unknown"
					});

					expect(albums).to.deep.equal([
						{
							id: 3,
							artist: "Terrorfakt",
							album: "Teethgrinder",
							year: 2006,
							genre: "Unknown"
						}
					]);

					return callback();
				}
			);
		});
	});

	describe("patch", function() {
		it("should be a function", function() {
			expect(envelope.patch instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			albums.push({
				id: 5,
				artist: "Man Man",
				album: "Six Demon Bag",
				year: 2006,
				genre: "Art Rock"
			});

			albums.push({
				id: 6,
				artist: "Man Man",
				album: "Life Fantastic",
				year: 2011,
				genre: "Indie Rock"
			});

			return envelope.patch(
				"albums/6",
				{
					album: "Rabbit Habits",
					year: 2008,
					genre: "Experimental"
				},
				null,
				{
					baseUrl: apiAddress
				},
				function(error, data, response) {
					expect(error).to.equal(null);

					expect(response.statusCode).to.equal(200);

					expect(data).to.deep.equal({
						id: 6,
						artist: "Man Man",
						album: "Rabbit Habits",
						year: 2008,
						genre: "Experimental"
					});

					expect(albums).to.deep.equal([
						{
							id: 5,
							artist: "Man Man",
							album: "Six Demon Bag",
							year: 2006,
							genre: "Art Rock"
						},
						{
							id: 6,
							artist: "Man Man",
							album: "Rabbit Habits",
							year: 2008,
							genre: "Experimental"
						}
					]);

					return callback();
				}
			);
		});
	});

	describe("delete", function() {
		it("should be a function", function() {
			expect(envelope.delete instanceof Function).to.equal(true);
		});

		it("should successfully execute a valid request", function(callback) {
			albums.push({
				id: 1,
				artist: "Vanilla",
				album: "Sweet Talk",
				year: 2014
			});

			albums.push({
				id: 2,
				artist: "Vanilla",
				album: "Origin",
				year: 2015
			});

			return envelope.delete(
				"albums/2",
				null,
				null,
				{
					baseUrl: apiAddress
				},
				function(error, data, response) {
					expect(error).to.equal(null);

					expect(response.statusCode).to.equal(200);

					expect(data).to.deep.equal({
						count: 1
					});

					expect(albums).to.deep.equal([
						{
							id: 1,
							artist: "Vanilla",
							album: "Sweet Talk",
							year: 2014
						}
					]);

					return callback();
				}
			);
		});
	});

	describe("upload", function() {
		it("should be a function", function() {
			expect(envelope.upload instanceof Function).to.equal(true);
		});
	});

	after(function(callback) {
		if(utilities.isInvalid(server)) {
			return callback();
		}

		server.close(function() {
			return callback();
		});
	});
});
