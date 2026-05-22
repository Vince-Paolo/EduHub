import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

// 🔐 Replace these with your actual Firebase project credentials
// Get them from: Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyDkE165KBRGJZMOTULxGEWsalSkxafkox4",
  authDomain: "eduhub-fc4b5.firebaseapp.com",
  projectId: "eduhub-fc4b5",
  storageBucket: "eduhub-fc4b5.firebasestorage.app",
  messagingSenderId: "381370816734",
  appId: "1:381370816734:web:f3077e193acf63a1a30a4f",
  measurementId: "G-ZE93G4LJ4V"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app