import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VictoryLine, VictoryChart, VictoryTheme, VictoryStack, VictoryBar, VictoryAxis, VictoryArea, VictoryScatter } from 'victory-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useUIStore } from '../../store/uiStore';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const BG = '#F8F5F1';
const NEON = '#d4f964';

export default function Analytics() {
  const { data, period, isLoading, fetch } = useAnalyticsStore();
  const insets = useSafeAreaInsets();
  const { toggleSidebar } = useUIStore();

  useFocusEffect(
    React.useCallback(() => {
      fetch(period);
    }, [period, fetch])
  );

  const togglePeriod = (newPeriod: '7d' | '30d') => {
    if (period !== newPeriod) fetch(newPeriod);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ─────────────────────────────── */}
      <LinearGradient
        colors={['#d9f972','#e8fcc2','#c7e3ff']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 8, zIndex: 9999, elevation: 9999 }}
      >
        <View className="w-full px-6 flex-row items-center justify-between h-14 relative z-[9999]">
          <View className="flex-row items-center gap-4 flex-1">
            <TouchableOpacity onPress={toggleSidebar} className="p-1">
              <Feather name="menu" size={24} color="black" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-black">Analytics</Text>
            </View>
          </View>
          
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: 2,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}>
            {(['7d', '30d'] as const).map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => togglePeriod(p)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: period === p ? 'black' : 'transparent',
                  shadowColor: period === p ? 'black' : undefined,
                  shadowOffset: period === p ? { width: 0, height: 1 } : undefined,
                  shadowOpacity: period === p ? 0.15 : undefined,
                  shadowRadius: 2,
                  elevation: period === p ? 1 : 0,
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: period === p ? 'white' : '#4B5563',
                }}>
                  {p === '7d' ? 'Week' : 'Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        className="w-full px-6"
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Hero Card */}
        <LinearGradient 
          colors={['#111', '#333']}
          className="rounded-[32px] p-8 mb-6 shadow-xl"
        >
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">Completion Rate</Text>
              <View className="flex-row items-end">
                <Text className="text-6xl font-black text-white tracking-tighter">
                  {data?.summary.completionPercent || 0}
                </Text>
                <Text className="text-2xl font-bold text-white/40 mb-2 ml-1">%</Text>
              </View>
            </View>
            <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center">
              <Feather name="trending-up" size={24} color={NEON} />
            </View>
          </View>
          
          {isLoading && !data ? (
            <ActivityIndicator color={NEON} size="small" />
          ) : (
            <Text className="text-white/70 text-sm leading-relaxed font-medium">
              {data?.summary.insight || "Collecting data to provide personalized productivity insights..."}
            </Text>
          )}
        </LinearGradient>

        <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
              <Text className="text-black text-[9px] font-bold tracking-widest uppercase mb-1">Avg Tasks/Day</Text>
              <Text className="text-2xl font-black text-black">{data?.avgTasksPerDay ? data.avgTasksPerDay.toFixed(1) : '0'}</Text>
            </View>
            <View className="flex-1 bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
              <Text className="text-black text-[9px] font-bold tracking-widest uppercase mb-1">Disruptions</Text>
              <Text className="text-2xl font-black text-black">{data?.lifeHappenedEvents?.length || 0}</Text>
            </View>
        </View>

        {/* Line Chart Card */}
        <View className="bg-white rounded-[32px] p-6 mb-6 shadow-sm border border-gray-100">
          <View className="mb-4">
            <Text className="text-black font-black text-lg">Daily Performance</Text>
            <Text className="text-gray-400 text-xs font-medium">Activity trends over the selected period</Text>
          </View>
          
          {isLoading && !data ? (
            <View className="h-60 items-center justify-center">
              <ActivityIndicator color="black" />
            </View>
          ) : data?.dailyCompletionRate ? (
            <View pointerEvents="none" className="items-center">
              <VictoryChart 
                height={350} 
                padding={{ top: 60, bottom: 40, left: 50, right: 40 }}
                domainPadding={{ y: [0, 50], x: [20, 20] }}
              >
                <VictoryAxis 
                  style={{
                    axis: { stroke: 'transparent' },
                    grid: { stroke: 'transparent' },
                    tickLabels: { fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }
                  }}
                />
                <VictoryAxis 
                  dependentAxis 
                  style={{
                    axis: { stroke: 'transparent' },
                    grid: { stroke: '#F3F4F6', strokeWidth: 1 },
                    tickLabels: { fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }
                  }}
                />
                <VictoryArea
                  style={{
                    data: { 
                      fill: "url(#gradient)", 
                      fillOpacity: 0.2, 
                      stroke: "none" 
                    }
                  }}
                  interpolation="natural"
                  data={data.dailyCompletionRate}
                  x="date"
                  y="rate"
                />
                <VictoryLine
                  style={{ 
                    data: { stroke: 'black', strokeWidth: 3 } 
                  }}
                  interpolation="natural"
                  data={data.dailyCompletionRate}
                  x="date"
                  y="rate"
                />
                <VictoryScatter
                  data={data.dailyCompletionRate}
                  x="date"
                  y="rate"
                  size={4}
                  style={{ data: { fill: "white", stroke: "black", strokeWidth: 2 } }}
                />
              </VictoryChart>
              
              {/* SVG Gradient Definition */}
              <View style={{ height: 0, width: 0 }}>
                <Svg>
                  <Defs>
                    <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor={NEON} />
                      <Stop offset="100%" stopColor="white" />
                    </SvgLinearGradient>
                  </Defs>
                </Svg>
              </View>
            </View>
          ) : (
            <View className="h-60 items-center justify-center">
              <Text className="text-gray-400 text-xs">Insufficient data for chart</Text>
            </View>
          )}
        </View>

        {/* Bar Chart Card */}
        <View className="bg-white rounded-[32px] p-6 mb-6 shadow-sm border border-gray-100">
          <View className="mb-4">
            <Text className="text-black font-black text-lg">Deferral Rate</Text>
            <Text className="text-gray-400 text-xs font-medium">Tasks deferred vs scheduled by day</Text>
          </View>
          
          {isLoading && !data ? (
            <View className="h-40 items-center justify-center">
              <ActivityIndicator color="black" />
            </View>
          ) : data?.deferralRate && data.deferralRate.length > 0 ? (
            <View pointerEvents="none" className="items-center">
              <VictoryChart theme={VictoryTheme.material} domainPadding={20} height={200}>
                <VictoryAxis style={{ tickLabels: { fontSize: 10, fontWeight: 'bold' } }} />
                <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
                <VictoryStack colorScale={[NEON, '#000']}>
                  <VictoryBar data={data.deferralRate} x="date" y="deferred" cornerRadius={{ top: 4 }} />
                  <VictoryBar data={data.deferralRate.map(d => ({ ...d, remaining: d.scheduled - d.deferred }))} x="date" y="remaining" cornerRadius={{ top: 4 }} />
                </VictoryStack>
              </VictoryChart>
            </View>
          ) : (
            <View className="h-40 items-center justify-center">
              <Text className="text-gray-400 text-xs">No deferral data found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
