import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';

const theme = Colors.palette;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
        tabBarActiveTintColor: theme.cta,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerTitleAlign: 'center',
      }}>
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <FontAwesome name="shopping-bag" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          headerTitle: '',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
