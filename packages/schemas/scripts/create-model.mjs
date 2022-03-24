import { writeFile } from 'node:fs/promises';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { ModelManager } from '@glazed/devtools';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { fromString } from 'uint8arrays';
// import 'dotenv/config' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import dotenv from 'dotenv';
dotenv.config();

let SEED = process.env.SEED;

if (!process.env.SEED) {
	// throw new Error('Missing SEED environment variable');
	// SEED = new Uint32Array(32);
	SEED = new Uint8Array([
		6, 190, 125, 152, 83, 9, 111, 202, 6, 214, 218, 146, 104, 168, 166, 110,
		202, 171, 42, 114, 73, 204, 214, 60, 112, 254, 173, 151, 170, 254, 250,
		2,
	]);
}
console.log('VIEW SEE ', SEED, SEED.length);
// The seed must be provided as an environment variable
// const seed = fromString(process.env.SEED, 'base16');
// const seed = fromString(SEED, 'base16');
// Create and authenticate the DID
const did = new DID({
	provider: new Ed25519Provider(SEED),
	resolver: getResolver(),
});
await did.authenticate();

// Connect to the local Ceramic node
const ceramic = new CeramicClient('http://localhost:7007');
ceramic.did = did;

// Create a manager for the model
const manager = new ModelManager(ceramic);

// Create the schemas
const passportSchemaId = await manager.createSchema('Passport', {
	$schema: 'http://json-schema.org/draft-07/schema#',
	title: 'Passport',
	type: 'object',
	properties: {
		dateCreated: {
			type: 'string',
			format: 'date-time',
			title: 'dateCreated',
			maxLength: 30,
		},
		dateUpdated: {
			type: 'string',
			format: 'date-time',
			title: 'dateUpdated',
			maxLength: 30,
		},
		stamps: {
			type: 'array',
			title: 'stamps',
			items: {
				type: 'object',
				title: 'stampItem',
				properties: {
					providerId: {
						type: 'string', // todo other schema?? add verifiable credential prop?
					},
					name: {
						type: 'string',
					},
					description: {
						type: 'string',
					},
					isVerified: {
						type: 'boolean',
					},
					dateVerified: {
						type: 'string',
						format: 'date-time',
					},
				},
			},
		},
	},
});
// TODO VC schema
// document for list of all available attestations

// const notesSchemaID = await manager.createSchema('Notes', {
//   $schema: 'http://json-schema.org/draft-07/schema#',
//   title: 'NotesList',
//   type: 'object',
//   properties: {
//     notes: {
//       type: 'array',
//       title: 'notes',
//       items: {
//         type: 'object',
//         title: 'NoteItem',
//         properties: {
//           id: {
//             $comment: `cip88:ref:${manager.getSchemaURL(noteSchemaID)}`,
//             type: 'string',
//             pattern: '^ceramic://.+(\\?version=.+)?',
//             maxLength: 150,
//           },
//           title: {
//             type: 'string',
//             title: 'title',
//             maxLength: 100,
//           },
//         },
//       },
//     },
//   },
// })

// Create the definition using the created schema ID
await manager.createDefinition('passport', {
	name: 'passport',
	description: 'Simple passport',
	schema: manager.getSchemaURL(passportSchemaId),
});

// // Create a Note with text that will be used as placeholder
// await manager.createTile(
//   'placeholderNote',
//   { text: 'This is a placeholder for the note contents...' },
//   { schema: manager.getSchemaURL(noteSchemaID) },
// )

// Write model to JSON file
await writeFile(
	new URL('model.json', import.meta.url),
	JSON.stringify(manager.toJSON())
);
console.log('Encoded model written to scripts/model.json file');
