import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

interface Props {
  onConfirm: (lostMinutes: number) => void;
}

export interface LifeHappenedSheetRef {
  expand: () => void;
  close: () => void;
}

const PRESETS = [15, 30, 45, 60, 120];
const LABELS: Record<number, string> = {
  15: '15 min',
  30: '30 min',
  45: '45 min',
  60: '1 hour',
  120: '2 hours',
};

export const LifeHappenedSheet = forwardRef<LifeHappenedSheetRef, Props>(({ onConfirm }, ref) => {
  const localRef = React.useRef<BottomSheet>(null);
  
  useImperativeHandle(ref, () => ({
    expand: () => localRef.current?.expand(),
    close: () => localRef.current?.close(),
  }));

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customVal, setCustomVal] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleConfirm = () => {
    let val = 0;
    if (isCustom && customVal) {
      val = parseInt(customVal, 10);
    } else if (selectedPreset) {
      val = selectedPreset;
    }
    
    if (val > 0) {
      onConfirm(val);
      setSelectedPreset(null);
      setCustomVal('');
      setIsCustom(false);
    }
  };

  const isReady = (isCustom && parseInt(customVal, 10) > 0) || (!isCustom && selectedPreset !== null);

  return (
    <BottomSheet ref={localRef} index={-1} snapPoints={['45%', '60%']} enablePanDownToClose>
      <BottomSheetView className="flex-1 p-6">
        <View className="mb-6 items-center">
           <Text className="text-3xl font-black text-gray-800 mb-1">Life Happened ⚡</Text>
           <Text className="text-gray-500 font-medium">How much time did you lose?</Text>
        </View>

        <View className="flex-row flex-wrap justify-center gap-3 mb-6">
           {PRESETS.map(preset => (
             <TouchableOpacity 
               key={preset}
               className={`py-3 px-5 rounded-xl border ${!isCustom && selectedPreset === preset ? 'bg-[#6C63FF] border-[#6C63FF]' : 'bg-gray-50 border-gray-200'}`}
               onPress={() => {
                 setSelectedPreset(preset);
                 setIsCustom(false);
               }}
             >
               <Text className={`font-bold tracking-wide ${!isCustom && selectedPreset === preset ? 'text-white' : 'text-gray-600'}`}>
                 {LABELS[preset]}
               </Text>
             </TouchableOpacity>
           ))}
           <TouchableOpacity 
             className={`py-3 px-5 rounded-xl border ${isCustom ? 'bg-[#6C63FF] border-[#6C63FF]' : 'bg-gray-50 border-gray-200'}`}
             onPress={() => setIsCustom(true)}
           >
             <Text className={`font-bold tracking-wide ${isCustom ? 'text-white' : 'text-gray-600'}`}>Custom</Text>
           </TouchableOpacity>
        </View>

        {isCustom && (
          <View className="mb-6 items-center flex-row justify-center pb-2">
            <TextInput 
              className="border-b-2 border-[#6C63FF] w-24 text-center text-3xl font-bold pb-1 text-gray-800 tracking-wider"
              keyboardType="numeric"
              placeholder="0"
              value={customVal}
              onChangeText={(txt) => setCustomVal(txt.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            <Text className="text-gray-400 font-black tracking-widest ml-3 mt-4 text-sm uppercase">minutes</Text>
          </View>
        )}

        <TouchableOpacity 
          className={`w-full py-4 rounded-xl items-center shadow-sm ${isReady ? 'bg-[#6C63FF]' : 'bg-gray-300'}`}
          disabled={!isReady}
          onPress={handleConfirm}
        >
          <Text className="text-white font-bold text-lg">Confirm Disruption</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
});
LifeHappenedSheet.displayName = 'LifeHappenedSheet';
