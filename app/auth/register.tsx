import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Feather } from '@expo/vector-icons';

export default function Register() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore(state => state.register);

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!name || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Invalid email format');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      await register(name, email, password);
      setSuccessMsg('Registration successful! Welcome to AIPS.');
      setTimeout(() => {
        router.replace('/(tabs)/');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="mb-10 items-center">
          <Text className="text-5xl font-bold text-[#6C63FF]">AIPS</Text>
          <Text className="text-lg text-gray-600 mt-2">Create a new account</Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-800 font-medium mb-1">Full Name</Text>
          <TextInput
            className="w-full border border-gray-300 rounded-lg p-4 text-black bg-gray-50 placeholder-gray-500"
            placeholder="Enter your full name"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-800 font-medium mb-1">Email</Text>
          <TextInput
            className="w-full border border-gray-300 rounded-lg p-4 text-black bg-gray-50 placeholder-gray-500"
            placeholder="Enter your email"
            placeholderTextColor="#6b7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-800 font-medium mb-1">Password</Text>
          <TextInput
            className="w-full border border-gray-300 rounded-lg p-4 text-black bg-gray-50 placeholder-gray-500"
            placeholder="Create a password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-800 font-medium mb-1">Confirm Password</Text>
          <TextInput
            className="w-full border border-gray-300 rounded-lg p-4 text-black bg-gray-50 placeholder-gray-500"
            placeholder="Confirm your password"
            placeholderTextColor="#6b7280"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        {errorMsg ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
            <Feather name="alert-circle" size={20} color="#ef4444" />
            <Text className="text-red-800 font-medium flex-1 text-sm">{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
            <Feather name="check-circle" size={20} color="#10b981" />
            <Text className="text-emerald-800 font-medium flex-1 text-sm">{successMsg}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          className="w-full bg-[#6C63FF] p-4 rounded-lg items-center flex-row justify-center"
          onPress={handleRegister}
          disabled={isLoading || !!successMsg}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" className="mr-2" />
          ) : null}
          <Text className="text-white font-bold text-lg">Register</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="mt-6 items-center"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="text-gray-600">Already have an account? <Text className="text-[#6C63FF] font-bold">Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}