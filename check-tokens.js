// Firestoreからトークン情報を確認する一時スクリプト
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .envファイルを読み込む
config({ path: resolve(__dirname, 'functions', '.env') });

// Firebase Admin初期化
initializeApp();

const db = getFirestore();

async function checkTokens() {
  console.log('=== OAuth Tokens Check ===\n');
  
  try {
    const tokensSnapshot = await db.collection('oauth_tokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('トークンが見つかりません。');
      return;
    }
    
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Token ID: ${doc.id}`);
      console.log(`  Provider: ${data.provider}`);
      console.log(`  Google Account: ${data.google_account}`);
      console.log(`  Has Access Token: ${!!data.access_token}`);
      console.log(`  Has Refresh Token: ${!!data.refresh_token}`);
      console.log(`  Expires At: ${data.expires_at?.toDate ? data.expires_at.toDate().toISOString() : data.expires_at}`);
      console.log(`  Created By: ${data.created_by}`);
      console.log(`  User UID: ${data.user_uid}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokens().then(() => process.exit(0));


