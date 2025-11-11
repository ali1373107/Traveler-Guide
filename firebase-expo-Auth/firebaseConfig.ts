// Import the functions you need from the SDKs you need
import * as firebaseAuth from 'firebase/auth';
    const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWNsET7xFYpbaRZe2t3BFuSizlxNbZRdM",
  authDomain: "fir-auth-a5ee4.firebaseapp.com",
  projectId: "fir-auth-a5ee4",
  storageBucket: "fir-auth-a5ee4.firebasestorage.app",
  messagingSenderId: "54464990155",
  appId: "1:54464990155:web:98cb6452864e498c6d444e",
  measurementId: "G-8GCH0YSLLY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app,
  {
    persistence: reactNativePersistence(ReactNativeAsyncStorage)
  }
);