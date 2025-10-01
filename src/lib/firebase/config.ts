import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDChk21vZHICLFMV1mu-15QYyAUKq4tQLI",
  authDomain: "growgroupreporter.firebaseapp.com",
  projectId: "growgroupreporter",
  storageBucket: "growgroupreporter.firebasestorage.app",
  messagingSenderId: "1014499109379",
  appId: "1:1014499109379:web:9ad3d2d680ae363110fc36"
};

// デバッグ情報
console.log('🔧 Firebase Config Debug:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId || 'MISSING'
});

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase Authentication
export const auth = getAuth(app);

// Firestore Database (ggreporterデータベースを使用 - Standard Edition)
export const firestore = getFirestore(app, 'ggreporter');

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/analytics.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/webmasters.readonly');

// GA4専用のプロバイダー（追加スコープ付き）
export const ga4Provider = new GoogleAuthProvider();
ga4Provider.addScope('https://www.googleapis.com/auth/analytics.readonly');
ga4Provider.addScope('https://www.googleapis.com/auth/analytics.manage.users.readonly');

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('https://graph.microsoft.com/user.read');

export default app;

