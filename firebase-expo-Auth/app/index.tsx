import { View, Text, StyleSheet } from 'react-native'
import React,{useState} from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '../firebaseConfig'
import { createUserWithEmailAndPassword,signInWithEmailAndPassword } from 'firebase/auth'
import { router } from 'expo-router'

    const Index = () => {
        const [email,setEmail] = useState('');
        const [password,setPassword ] = useState('');
        
        const signIn = async () => {
            try {
                const user = await signInWithEmailAndPassword(auth,email,password)
                if(user) router.replace('/(tabs)')
              
            } catch (error:any) {
                console.log(error.message)
                alert('SignIn failed: '+error.message);
            }
        }
        const signUp = async () => {
            try {
                const user = await createUserWithEmailAndPassword(auth,email,password)
                if(user) router.replace('/(tabs)');
                } catch (error:any) {
                console.log(error.message)
                alert('SignUp failed: '+error.message);
                }
        }

    return (
        <SafeAreaView>
            <Text>Login</Text>

        </SafeAreaView>
    )
}
export default Index

