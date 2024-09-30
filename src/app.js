const express = require('express');
const cors = require('cors');
const { json } = require('body-parser');
const fs = require('fs');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const parse = require('csv-parse/lib/sync');

const app = express()
  .use(cors())
  .use(json());

console.log('Getting schemas...');

const schema = buildSchema(fs.readFileSync('graphql/schema.graphql', 'utf8'));

console.log('Getting data...');
const groups = parse(fs.readFileSync('data/groups.csv', 'utf8'), { columns: true });
const repos = parse(fs.readFileSync('data/repos.csv', 'utf8'), { columns: true });

console.log('Setting up API root...');

const root = {
  groups: (args) => {
    if (args.parentGroupPath === undefined) {
        return groups.filter(group => group.parentgroup === "");
    }

    if (args.parentGroupPath) {
        return groups.filter(group => group.parentgroup === args.parentGroupPath);
    }

    throw new Error("Error getting Groups");
  },
  repos: (args) => {
    if (args.parentGroupPath === undefined) {
        throw new Error("Parent Group can not be empty");
    }

    if (args.parentGroupPath) {
        return repos.filter(repo => repo.parentgroup === args.parentGroupPath);
    }

    throw new Error("Error getting Repos");
  }
};

app.use('/graphql', graphqlHTTP({
  schema,
  rootValue: root,
  graphiql: true,
}));

app.listen(4201, (err) => {
  if (err) {
    return console.log(err);
  }
  return console.log('Server listening on port 4201');
});