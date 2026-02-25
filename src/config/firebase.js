import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Firebase設定が不完全な場合の警告
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;
let storage = null;
let functions = null;
let googleProvider = null;
let microsoftProvider = null;

if (isFirebaseConfigured) {
  // Firebaseアプリの初期化
  app = initializeApp(firebaseConfig);

  // 各サービスの初期化
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'asia-northeast1'); // 東京リージョンを指定

  // Google認証プロバイダー
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account', // 常にアカウント選択画面を表示
  });

  // Microsoft認証プロバイダー（Firebase Console で Microsoft を有効化した場合に使用）
  microsoftProvider = new OAuthProvider('microsoft.com');
  microsoftProvider.setCustomParameters({
    prompt: 'login', // アカウント選択を促す
  });
} else {
  console.warn('⚠️ Firebase configuration is missing. Please create a .env file with Firebase credentials.');
  console.warn('📝 See FIREBASE_SETUP.md for setup instructions.');
}

export { auth, db, storage, functions, googleProvider, microsoftProvider };
export default app;

