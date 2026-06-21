import { Audio } from 'expo-av';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

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

// Tarayıcının desteklediği ilk MIME tipini döner
function pickWebMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);

  // native
  const nativeRecordingRef = useRef(null);

  // web
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = useCallback(async () => {
    if (IS_WEB) {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Bu tarayıcı mikrofon erişimini desteklemiyor.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickWebMimeType();
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
    } else {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Mikrofon izni verilmedi. Ayarlardan izin vermen gerekiyor.');
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(WAV_RECORDING_OPTIONS);
      nativeRecordingRef.current = recording;
    }
    setIsRecording(true);
  }, []);

  const stop = useCallback(async () => {
    if (IS_WEB) {
      const mr = mediaRecorderRef.current;
      if (!mr) { setIsRecording(false); return null; }
      return new Promise((resolve) => {
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          mr.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setIsRecording(false);
          resolve(blob);
        };
        mr.stop();
      });
    } else {
      const recording = nativeRecordingRef.current;
      if (!recording) { setIsRecording(false); return null; }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      nativeRecordingRef.current = null;
      setIsRecording(false);
      return uri;
    }
  }, []);

  const cancel = useCallback(async () => {
    if (IS_WEB) {
      const mr = mediaRecorderRef.current;
      if (mr) {
        mr.onstop = null;
        try { mr.stop(); } catch (_e) {}
        mr.stream?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
      }
      chunksRef.current = [];
    } else {
      const recording = nativeRecordingRef.current;
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (_e) {}
        nativeRecordingRef.current = null;
      }
    }
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop, cancel };
}
