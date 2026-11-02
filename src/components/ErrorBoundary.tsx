import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = { children: React.ReactNode };

// Beklenmedik bir hata uygulamayı boş ekranda bırakmasın
export class ErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0A1A3C' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>Something went wrong</Text>
        <Text style={{ color: '#A9BFE6', fontSize: 15, textAlign: 'center', marginTop: 8 }}>
          Your saved game is safe.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => this.setState({ failed: false })}
          style={{ marginTop: 20, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, backgroundColor: '#2F7DE8' }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}
