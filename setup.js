const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/PERFECTION/Desktop/FP/aips/frontend';

const files = {
  'babel.config.js': `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
};`,
  'metro.config.js': `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
  'global.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  'app/_layout.tsx': `import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}`,
  'app/(tabs)/_layout.tsx': `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}`,
  'app/(tabs)/index.tsx': `import { View, Text } from 'react-native';\nexport default function Home() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Home Screen</Text></View>; }`,
  'app/(tabs)/tasks/index.tsx': `import { View, Text } from 'react-native';\nexport default function Tasks() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Tasks Screen</Text></View>; }`,
  'app/(tabs)/tasks/add.tsx': `import { View, Text } from 'react-native';\nexport default function AddTask() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Add Task Screen</Text></View>; }`,
  'app/(tabs)/tasks/[id].tsx': `import { View, Text } from 'react-native';\nexport default function TaskDetail() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Task Detail Screen</Text></View>; }`,
  'app/(tabs)/analytics.tsx': `import { View, Text } from 'react-native';\nexport default function Analytics() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Analytics Screen</Text></View>; }`,
  'app/(tabs)/profile.tsx': `import { View, Text } from 'react-native';\nexport default function Profile() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Profile Screen</Text></View>; }`,
  'app/auth/login.tsx': `import { View, Text } from 'react-native';\nexport default function Login() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Login Screen</Text></View>; }`,
  'app/auth/register.tsx': `import { View, Text } from 'react-native';\nexport default function Register() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Register Screen</Text></View>; }`,
  'app/onboarding.tsx': `import { View, Text } from 'react-native';\nexport default function Onboarding() { return <View className="flex-1 items-center justify-center"><Text className="text-xl">Onboarding Screen</Text></View>; }`,
  'lib/constants.ts': `export const API_URL = "http://localhost:3000";\nexport const PRIORITY_COLORS = { high:"#EF4444", medium:"#F97316", low:"#22C55E" };\nexport const SLOT_HEIGHT = 60;`
};

for (const [filepath, content] of Object.entries(files)) {
  const fullpath = path.join(dir, filepath);
  fs.mkdirSync(path.dirname(fullpath), { recursive: true });
  fs.writeFileSync(fullpath, content);
}

// Modify package.json to use expo-router
const pkgPath = path.join(dir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.main = "expo-router/entry";
if (!pkg.scripts) pkg.scripts = {};
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Update app.json
const appJsonPath = path.join(dir, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
if (!appJson.expo.scheme) {
  appJson.expo.scheme = "aips";
}
appJson.expo.web = appJson.expo.web || {};
appJson.expo.web.bundler = "metro"; // Nativewind on web is better with metro
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log("Successfully generated configuration files and stub screens.");
