quicktype --graphql-schema gqlschema.json --graphql-introspect https://wnzihyd3zndg3i3zdo6ijwslze.appsync-api.us-west-2.amazonaws.com/graphql --http-header "Authorization: $ID_TOKEN" --http-method POST
quicktype --lang typescript --just-types --graphql-schema gqlschema.json ./query.graphql >Query.ts
