import { Amplify } from "https://cdn.jsdelivr.net/npm/aws-amplify@6.0.0/+esm";
import { Hub } from "https://cdn.jsdelivr.net/npm/aws-amplify@6.0.0/utils/+esm";
import {
  signInWithRedirect,
  signOut as amplifySignOut,
  fetchAuthSession,
  getCurrentUser,
} from "https://cdn.jsdelivr.net/npm/aws-amplify@6.0.0/auth/+esm";
import { cognitoConfig } from "/auth-config.js";

export function init() {
  Amplify.configure(cognitoConfig);
}

// Wait for Amplify's OAuth code-for-token exchange to finish before we
// probe the session. The previous 800 ms timeout raced the network
// round-trip to Cognito's /oauth2/token endpoint — when the exchange
// came back late, fetchAuthSession() returned no tokens and the user
// got bounced back to the sign-in card.
export function awaitOAuthCompletion() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      stop();
      clearTimeout(safety);
      resolve(outcome);
    };
    const stop = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect" || payload.event === "signedIn") {
        finish("success");
      } else if (payload.event === "signInWithRedirect_failure") {
        console.error("[auth] signInWithRedirect_failure:", payload.data);
        finish("failure");
      }
    });
    const safety = setTimeout(() => {
      console.warn("[auth] OAuth completion Hub event timed out after 10s");
      finish("timeout");
    }, 10000);
  });
}

export async function getSession() {
  const session = await fetchAuthSession();
  if (!session.tokens?.idToken) return null;
  const user = await getCurrentUser();
  const payload = session.tokens.idToken.payload || {};
  const groups = payload["cognito:groups"] || [];
  return { user, groups };
}

export function signIn() {
  return signInWithRedirect({ provider: "Cognito" });
}

export async function signOut() {
  return amplifySignOut();
}
