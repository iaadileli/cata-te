// Solo lo que usa nube.js. Se empaqueta con: npm run firebase  → vendor/firebase.js
export { initializeApp } from "firebase/app";
export { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, onSnapshot, waitForPendingWrites } from "firebase/firestore";
