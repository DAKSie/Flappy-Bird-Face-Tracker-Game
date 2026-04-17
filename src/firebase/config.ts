import { initializeApp } from 'firebase/app'
import { child, get, getDatabase, ref, set } from 'firebase/database'

const readEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: readEnv('VITE_FIREBASE_DATABASE_URL'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db, ref, set, get, child }
