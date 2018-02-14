# Node Envelope

[![NPM version][npm-version-image]][npm-url]
[![Build Status][build-status-image]][build-status-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![Downloads][npm-downloads-image]][npm-url]

A wrapper for the request module to allow for simpler RESTful API transactions.

## Server-Side Usage

```javascript
var envelope = require("node-envelope");

envelope.setBaseUrl("http://127.0.0.1:3000");

envelope.get(
	"status",
	function(error, result) {
		if(error) {
			return console.error(error);
		}

		return console.log(result);
	}
);
```

## Installation

To install this module:
```bash
npm install node-envelope
```

[npm-url]: https://www.npmjs.com/package/node-envelope
[npm-version-image]: https://img.shields.io/npm/v/node-envelope.svg
[npm-downloads-image]: http://img.shields.io/npm/dm/node-envelope.svg

[build-status-url]: https://travis-ci.org/nitro404/node-envelope
[build-status-image]: https://travis-ci.org/nitro404/node-envelope.svg?branch=master

[coverage-url]: https://coveralls.io/github/nitro404/node-envelope?branch=master
[coverage-image]: https://coveralls.io/repos/github/nitro404/node-envelope/badge.svg?branch=master

[snyk-url]: https://snyk.io/test/github/nitro404/node-envelope?targetFile=package.json
[snyk-image]: https://snyk.io/test/github/nitro404/node-envelope/badge.svg?targetFile=package.json
