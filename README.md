# Node Envelope

A wrapper for the request module to allow for simpler RESTful API transactions.

## Server-Side Usage

```javascript
var envelope = require("node-envelope");

envelope.get(
	"http://127.0.0.1:3000/status",
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
