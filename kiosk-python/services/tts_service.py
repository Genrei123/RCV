"""
Text-to-Speech Service for Filipino/English voice output
"""
import os
import platform
import threading
import subprocess
from config import TTSConfig

# Check TTS availability
TTS_AVAILABLE = False
TTS_ENGINE = None

try:
    import edge_tts
    TTS_AVAILABLE = True
    TTS_ENGINE = "edge_tts"
except ImportError:
    pass

if not TTS_AVAILABLE:
    try:
        import pyttsx3
        TTS_AVAILABLE = True
        TTS_ENGINE = "pyttsx3"
    except ImportError:
        pass

if not TTS_AVAILABLE:
    try:
        from gtts import gTTS
        import pygame
        TTS_AVAILABLE = True
        TTS_ENGINE = "gtts"
    except ImportError:
        print("TTS not available. Install edge-tts for best Filipino voice: pip install edge-tts")

class TTSService:
    """Text-to-Speech service with Filipino neural voices"""
    
    def __init__(self):
        self.enabled = TTS_AVAILABLE
        self.is_muted = False
        self.temp_dir = os.path.expanduser("~/kiosk_temp")
        os.makedirs(self.temp_dir, exist_ok=True)
        self.engine = None
        self.is_speaking = False
        self.playback_process = None
        
        print(f"TTS Engine: {TTS_ENGINE}")
        
        if TTS_AVAILABLE and TTS_ENGINE == "pyttsx3":
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', 150)
    
    def speak(self, text: str, lang: str = "fil"):
        """Speak text using Microsoft neural voice"""
        if not self.enabled or self.is_muted or self.is_speaking:
            return
        
        try:
            thread = threading.Thread(target=self._speak_async, args=(text, lang), daemon=True)
            thread.start()
        except Exception as e:
            print(f"TTS error: {e}")
    
    def _speak_async(self, text: str, lang: str):
        """Async TTS playback"""
        self.is_speaking = True
        try:
            if TTS_ENGINE == "edge_tts":
                self._speak_edge_tts(text, lang)
            elif TTS_ENGINE == "pyttsx3":
                self.engine.say(text)
                self.engine.runAndWait()
            elif TTS_ENGINE == "gtts":
                tts = gTTS(text=text, lang=lang if lang != "fil" else "tl", slow=False)
                filepath = os.path.join(self.temp_dir, "tts_temp.mp3")
                tts.save(filepath)
                self._play_audio(filepath)
        except Exception as e:
            print(f"TTS playback error: {e}")
        finally:
            self.is_speaking = False
    
    def _speak_edge_tts(self, text: str, lang: str):
        """Use Microsoft Edge neural TTS"""
        try:
            import asyncio
            voice = TTSConfig.FILIPINO_VOICE if lang == "fil" else TTSConfig.ENGLISH_VOICE
            filepath = os.path.join(self.temp_dir, "tts_edge.mp3")
            
            async def generate():
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(filepath)
            
            asyncio.run(generate())
            self._play_audio(filepath)
        except Exception as e:
            print(f"Edge TTS error: {e}")
    
    def _play_audio(self, filepath: str):
        """Play audio file using system player"""
        try:
            if platform.system() == 'Linux':
                # Try multiple players
                for player in ['mpg123', 'ffplay', 'aplay', 'mpv']:
                    try:
                        self.playback_process = subprocess.Popen(
                            [player, filepath],
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL
                        )
                        self.playback_process.wait()
                        break
                    except FileNotFoundError:
                        continue
            elif platform.system() == 'Windows':
                import winsound
                winsound.PlaySound(filepath, winsound.SND_FILENAME)
            elif platform.system() == 'Darwin':  # macOS
                subprocess.run(['afplay', filepath], check=True)
        except Exception as e:
            print(f"Audio playback error: {e}")
    
    def stop(self):
        """Stop current playback"""
        try:
            if self.playback_process:
                self.playback_process.terminate()
                self.playback_process = None
        except:
            pass
    
    def toggle_mute(self):
        """Toggle mute state"""
        self.is_muted = not self.is_muted
        if self.is_muted:
            self.stop()
