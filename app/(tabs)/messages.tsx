import React from 'react';
import { View, Text } from 'react-native';

export default function Messages() {
  return (
    <View className="flex-1 items-center justify-center bg-[#F8F5F1]">
      <Text className="text-2xl font-black text-black">Messages</Text>
      <Text className="text-gray-400 mt-2">Incoming communications will appear here.</Text>
    </View>
  );
}
