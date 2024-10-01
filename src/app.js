const express = require("express");
const cors = require("cors");
const { json } = require("body-parser");
const fs = require("fs");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const jwt = require("jsonwebtoken");

const parse = require("csv-parse/lib/sync");

const app = express().use(cors()).use(json());

// JWT middleware (Decoding only, no verification)
app.use((req, res, next) => {
    const token = req.headers["authorization"];
    
    if (token) {
        try {
            // Decode the JWT token without verifying
            const decodedToken = jwt.decode(token.replace("Bearer ", ""));

            if (decodedToken) {
                // Attach the decoded token to the request object
                req.authPayload = decodedToken;        
            }
        
        } catch (error) {
            console.log("Error decoding token");
        }
    }
    next();
});

console.log("Getting schemas...");

const schema = buildSchema(fs.readFileSync("graphql/schema.graphql", "utf8"));

console.log("Getting data...");
const groups = parse(fs.readFileSync("data/groups.csv", "utf8"), {
    columns: true,
});
const repos = parse(fs.readFileSync("data/repos.csv", "utf8"), {
    columns: true,
});

console.log("Setting up API root...");

const root = {
    groups: (args, context) => {
        if (args.parentGroupPath === undefined) {
            return groups.filter((group) => group.parentgroup == context.authPayload.uid);
        }

        if (args.parentGroupPath) {
            return groups.filter(
                (group) => group.parentgroup === args.parentGroupPath
            );
        }

        throw new Error("Error getting Groups");
    },
    repos: (args, context) => {
        if (args.parentGroupPath === undefined) {
            return repos.filter((repo) => repo.parentgroup == context.authPayload.uid);
        }

        if (args.parentGroupPath) {
            return repos.filter((repo) => repo.parentgroup == args.parentGroupPath);
        }

        throw new Error("Error getting Repos");
    },
};

app.use(
    "/graphql",
    graphqlHTTP((req) => ({
        schema,
        context: {
            authPayload: req.authPayload,
        },
        rootValue: root,
        graphiql: { headerEditorEnabled: true },
    }))
);

app.listen(4201, (err) => {
    if (err) {
        return console.log(err);
    }
    return console.log("Server listening on port 4201");
});
