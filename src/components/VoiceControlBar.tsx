import { Home, Video, Mic, MicOff, Pause, Play, RotateCcw, ArrowRight } from 'lucide-react'
import { voiceLabels, type VoiceState } from '../data/mockLesson'

export function VoiceControlBar({ voice, muted, paused, speed, last, onExit, onCamera, onMute, onPause, onCycle, onVoice, onSpeed, onReset, onNext }: {
  voice: VoiceState; muted: boolean; paused: boolean; speed: string; last: boolean;
  onExit: () => void; onCamera: () => void; onMute: () => void; onPause: () => void; onCycle: () => void; onVoice: (v: VoiceState) => void; onSpeed: (s: string) => void; onReset: () => void; onNext: () => void;
}) {
  return <footer className="voice-bar">
    <button className="exit-button" onClick={onExit}><Home size={26}/><span>退出课堂</span></button>
    <div className="device-controls"><button onClick={onCamera} aria-label="摄像头尚未接入"><Video size={29}/><span>摄像头<small>未接入</small></span></button><button onClick={onMute} aria-pressed={muted} className={muted ? 'device-muted' : ''}>{muted ? <MicOff size={29}/> : <Mic size={29}/>}<span>{muted ? '已静音' : '麦克风'}<small>模拟</small></span></button><button onClick={onPause} aria-label={paused ? '继续课堂' : '暂停课堂'} aria-pressed={paused}>{paused ? <Play size={24}/> : <Pause size={24}/>}<span>{paused ? '继续' : '暂停'}</span></button></div>
    <div className={`voice-center voice-${voice}`}><div className="voice-orb-row"><div className="wave" aria-hidden="true">{[14, 29, 42, 24, 35, 20].map((height, i) => <i key={i} style={{ height, animationDelay: `${i * .13}s` }}/>)}</div><button className="voice-orb" onClick={onCycle} aria-label="切换语音模拟状态" title="仅切换模拟状态，不录音">{muted ? <MicOff size={43}/> : <Mic size={43}/>}</button><div className="wave wave-right" aria-hidden="true">{[20, 35, 24, 42, 29, 14].map((height, i) => <i key={i} style={{ height, animationDelay: `${i * .13}s` }}/>)}</div></div><label className="voice-state-label"><select aria-label="语音模拟状态" value={voice} onChange={e => onVoice(e.target.value as VoiceState)}>{Object.entries(voiceLabels).map(([v, text]) => <option key={v} value={v}>{text} · 模拟</option>)}</select></label><span className="voice-caption">连续语音演示 · AI / 语音 API 尚未接入</span></div>
    <div className="speed-control" aria-label="模拟语速">{[{ id: 'slow', text: '慢' }, { id: 'normal', text: '正常' }, { id: 'fast', text: '快' }].map(s => <button key={s.id} onClick={() => onSpeed(s.id)} aria-pressed={speed === s.id} className={speed === s.id ? 'active' : ''}>{s.text}</button>)}</div>
    <button className="reset-button" onClick={onReset}><RotateCcw size={28}/><span>重新开始</span></button>
    <button className="next-button" onClick={onNext} disabled={paused}><span>{last ? '再练一次' : '下一步'}</span><ArrowRight size={25}/></button>
  </footer>
}
