// AWS Cognito configuration for AchieveCE Docs
// Dedicated user pool — separate from any production pool
export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: "us-east-2_0gKmcU86y",
      userPoolClientId: "3gs30hneto0ha0rsrbrt0ut3gj",
      loginWith: {
        oauth: {
          domain: "achievece-docs-auth.auth.us-east-2.amazoncognito.com",
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [
            "https://docs.achievece.com/callback",
            "http://localhost:3003/callback",
          ],
          redirectSignOut: [
            "https://docs.achievece.com",
            "http://localhost:3003",
          ],
          responseType: "code",
        },
      },
    },
  },
};
