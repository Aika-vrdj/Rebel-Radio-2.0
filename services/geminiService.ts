import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Broadcast, BroadcastMode } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBroadcastData = async (
  prompt: string, 
  mode: BroadcastMode
): Promise<Partial<Broadcast>> => {
  let title: string;
  let ttsText: string;

  // 1. GENERACIÓN DE TEXTO (Mantenemos esto para el guion)
  if (mode === BroadcastMode.CREATIVE) {
    const conceptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a JSON object for Rebel Radio:
      - title: A gritty cyberpunk title based on "${prompt}".
      - script: A short host intro (max 120 chars) describing the sound.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            script: { type: Type.STRING },
          },
          required: ['title', 'script']
        }
      }
    });

    const parsed = JSON.parse(conceptResponse.text || '{}');
    title = parsed.title;
    ttsText = `Broadcasting from the underground... Rebel Radio is live. Tonight's signal: ${parsed.script}`;
  } else {
    // Modo Manual: Solo generamos un título rápido
    const metaResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give a 2-word cyberpunk title for this message: "${prompt}"`,
    });
    
    title = metaResponse.text || "Incoming Signal";
    ttsText = prompt;
  }

  // 2. GENERACIÓN DE AUDIO (Lo que realmente importa)
  const finalAudioText = mode === BroadcastMode.MANUAL 
    ? `One of our listeners says: ${ttsText}` 
    : ttsText;

  const audioResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ 
      parts: [{ 
        text: `Persona: You are a cool, gritty, underground Rebel Radio DJ. Instruction: Read this: "${finalAudioText}"`
      }]
    }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const audioData = audioResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || '';

  // 3. RETORNO SIMPLIFICADO
  return {
    title,
    script: ttsText,
    audioData,
    imageUrl: 'https://8i2lyyp4z9.ufs.sh/f/wkNKU1LyOpNgacHHzCAdxsIb68hCEn4TJuGqtSlFBV5vDPf2', // Usamos una imagen estática o la de los labios
    prompt,
    mode,
    createdAt: Date.now()
  };
};

export const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioDataToBuffer = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const createWavBlob = (base64Pcm: string, sampleRate: number = 24000): Blob => {
  const pcmData = decodeBase64(base64Pcm);
  const length = pcmData.byteLength;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  view.setUint32(0, 0x52494646, false); 
  view.setUint32(4, 36 + length, true);
  view.setUint32(8, 0x57415645, false); 
  
  view.setUint32(12, 0x666d7420, false); 
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  
  view.setUint32(36, 0x64617461, false); 
  view.setUint32(40, length, true);

  return new Blob([wavHeader, pcmData.buffer], { type: 'audio/wav' });
};