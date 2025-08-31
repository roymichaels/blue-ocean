import { Tabs } from "expo-router";
import * as Lucide from 'lucide-react-native';
import { ConfigProvider } from "../contexts/ConfigContext";
import { AuthProvider } from "../components/AuthContext";
import { AuthModalProvider } from "../components/AuthModalContext";
import { TenantProvider } from "../contexts/TenantContext";
import { AppInfoProvider } from "../contexts/AppInfoContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { CurrencyProvider } from "../contexts/CurrencyContext";
import { NotificationProvider } from "../components/NotificationContext";

export default function RootLayout() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <AuthModalProvider>
          <TenantProvider>
            <AppInfoProvider>
              <ThemeProvider>
                <LanguageProvider>
                  <CurrencyProvider>
                    <NotificationProvider>
                      <Tabs screenOptions={{ headerShown: false }}>
                        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ size, color }) => <Lucide.Home size={size} color={color} /> }} />
                        <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: ({ size, color }) => <Lucide.Grid3x3 size={size} color={color} /> }} />
                        <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ size, color }) => <Lucide.Package size={size} color={color} /> }} />
                        <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: ({ size, color }) => <Lucide.Bell size={size} color={color} /> }} />
                        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ size, color }) => <Lucide.User size={size} color={color} /> }} />
                      </Tabs>
                    </NotificationProvider>
                  </CurrencyProvider>
                </LanguageProvider>
              </ThemeProvider>
            </AppInfoProvider>
          </TenantProvider>
        </AuthModalProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
