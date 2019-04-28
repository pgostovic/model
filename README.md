# @phnq/model

[![CircleCI](https://circleci.com/gh/pgostovic/message.svg?style=svg)](https://circleci.com/gh/pgostovic/model)

[![npm version](https://badge.fury.io/js/%40phnq%2Fmodel.svg)](https://badge.fury.io/js/%40phnq%2Fmodel)

Isomorphic library for modeling entities.

- client and server share the same models
- serialize/deserialize for easy transfer between client and server
- server-side data persistence against a well-defined abstract interface
- two datastore implementations at the moment: 1) MongoDB, 2) In Memory (for testing)

## Usage

[See tests for usage examples.](src/__tests__)
[See datastore tests for configuration examples.](src/datastores/__tests__)
