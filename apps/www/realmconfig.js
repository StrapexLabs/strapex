import * as Realm from "realm-web";

// Replace with your Realm App ID
const appId = "strapex-ytjxdpu"; 

// Initialize the Realm app
const app = new Realm.App({ id: appId });

export { app };