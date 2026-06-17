import { Audio } from 'expo-av';
import { useCallback, useRef, useState } from 'react';

const WAV_RECORDING_OPTIONS = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 128000,
  },
};

export function useAudioRecorder() {
  const recordingRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Mikrofon izni verilmedi. Ayarlardan izin vermen gerekiyor.');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(WAV_RECORDING_OPTIONS);
    recordingRef.current = recording;
    setIsRecording(true);
  }, []);

  const stop = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      return null;
    }
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recordingRef.current = null;
    setIsRecording(false);
    return uri;
  }, []);

  const cancel = useCallback(async () => {
    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (_e) {
      }
      recordingRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop, cancel };
}