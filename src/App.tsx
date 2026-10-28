import { useState } from 'react'
import { ArrowRight, BookOpen, Check, LogOut, Play, Settings2 } from 'lucide-react'
import { Header } from './components/Header'
import { EmmaAvatar } from './components/EmmaAvatar'
import { LessonStage } from './components/LessonStage'
import { ConversationPanel } from './components/ConversationPanel'
import { VoiceControlBar } from './components/VoiceControlBar'
import { Modal } from './components/Modal'
import { animals, mockConversation, mockLesson, voiceCycle, type AnimalId, type Message, type VoiceState } from './data/mockLesson'

export default function App() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<AnimalId | null>(null)
  const [hint, setHint] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [messages, setMessages] = useState<Message[]>(mockConversation)
  const [baseVoice, setBaseVoice] = useState<VoiceState>('listening')
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [mood, setMood] = useState('speaking')
  const [speed, setSpeed] = useState('normal')
  const [translate, setTranslate] = useState(false)
  const [exited, setExited] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const voice: VoiceState = paused ? 'paused' : muted ? 'muted' : baseVoice
  const target = mockLesson.steps[step].target
  function notify(text: string) { setToast(text) }
  function addMessage(speaker: Message['speaker'], text: string, translation?: string) { setMessages(m => [...m, { id: crypto.randomUUID(), speaker, text, translation }]) }
  function selectAnimal(id: AnimalId) {
    if (paused || exited) return
    setSelected(id)
    addMessage('在在', id)
    const correct = id === target
    addMessage('Emma', correct ? `Great! That’s right. It’s a ${id}!` : `Good try! That’s a ${id}. Can you find the ${target}?`, correct ? '太棒了，答对了！' : '再仔细看看，试一试吧。')
    setMood(correct ? 'encouraging' : 'thinking')
    setBaseVoice('speaking')
    notify(correct ? '选对了！这是本地图片练习反馈。' : '再试一次，点击「提示我一下」可以获得帮助。')
  }
  function goStep(index: number) {
    setStep(index); setSelected(null); setHint(false); setMood('speaking'); setBaseVoice('listening')
    setMessages([{ id: crypto.randomUUID(), speaker: 'Emma', text: `Let’s look at the animals. Can you find the ${mockLesson.steps[index].target}?`, translation: `看看这些动物，你能找到${animals.find(a => a.id === mockLesson.steps[index].target)!.chinese}吗？` }])
  }
  function reset() {
    setStep(0); setSelected(null); setHint(false); setMessages(mockConversation); setBaseVoice('listening'); setMuted(false); setPaused(false); setMood('speaking'); setSpeed('normal'); setToast('演示已重置。'); setExited(false)
  }
  function onVoice(value: VoiceState) {
    setPaused(value === 'paused'); setMuted(value === 'muted')
    if (value !== 'paused' && value !== 'muted') setBaseVoice(value)
  }
  function audio() { setBaseVoice('speaking'); notify('音频播放状态模拟：尚未接入音频或语音 API。') }
  return <div className="app-shell">
    <Header onNavigate={name => { if (name === '上课') { if (exited) setExited(false) } else setModal(name) }} onSettings={() => setModal('课堂设置')}/>
    {exited ? <main className="reentry"><div className="reentry-card"><BookOpen size={52}/><span className="demo-badge">M1 模拟课堂</span><h1>课堂已退出</h1><p>Emma 在这里等你。准备好了，就回来继续认识动物吧。</p><p className="muted-copy">本次练习进度仍保留在当前页面中。</p><div className="reentry-actions"><button className="primary-button" onClick={() => { setExited(false); setPaused(false) }}><Play size={19}/>重新进入课堂</button><button className="soft-button" onClick={reset}>从头开始</button></div></div></main> : <>
      <main className={`classroom-layout ${collapsed ? 'panel-collapsed' : ''}`}>
        <EmmaAvatar voice={voice} mood={mood} onMood={value => { setMood(value); if (value === 'thinking') setBaseVoice('thinking'); if (value === 'speaking') setBaseVoice('speaking') }} onAudio={audio}/>
        <LessonStage step={step} selected={selected} hint={hint} panelCollapsed={collapsed} disabled={paused} onSelect={selectAnimal} onHint={() => setHint(v => !v)} onAudio={audio} onDirectory={() => setModal('课程目录')} onExpand={() => setCollapsed(false)}/>
        {!collapsed && <ConversationPanel messages={messages} target={target} translate={translate || hint} onCollapse={() => setCollapsed(true)} onAudio={audio} onSend={text => { if (paused) { notify('课堂已暂停，请先继续课堂。'); return } const found = animals.find(a => a.id === text.toLowerCase().trim()); if (found) selectAnimal(found.id); else { addMessage('在在', text); addMessage('Emma', `Let’s practice one animal word: ${target}.`, '这是本地固定脚本回复，尚未接入 AI。'); notify('已显示本地脚本回复，尚未接入 AI。') } }}/ >}
        {paused && <div className="pause-notice" role="status"><Play size={22}/><strong>课堂已暂停</strong><button onClick={() => setPaused(false)}>继续课堂</button></div>}
      </main>
      <VoiceControlBar voice={voice} muted={muted} paused={paused} speed={speed} last={step === 4} onExit={() => setModal('退出课堂')} onCamera={() => setModal('摄像头')} onMute={() => setMuted(v => !v)} onPause={() => setPaused(v => !v)} onCycle={() => { const index = voiceCycle.indexOf(baseVoice); onVoice(voiceCycle[(index + 1) % voiceCycle.length]) }} onVoice={onVoice} onSpeed={s => { setSpeed(s); notify(`语速已设为${s === 'slow' ? '慢速' : s === 'fast' ? '快速' : '正常'}（模拟）。`) }} onReset={reset} onNext={() => step === 4 ? reset() : goStep(step + 1)}/>
    </>}
    {toast && <div className="toast" role="status"><span>{toast}</span><button onClick={() => setToast('')} aria-label="关闭状态提示">×</button></div>}
    {modal && <Modal title={modal} onClose={() => setModal(null)}>
      {modal === '退出课堂' ? <><div className="modal-illustration"><LogOut size={34}/></div><p>要暂时离开课堂吗？本次页面中的练习进度会保留。</p><div className="modal-actions"><button className="soft-button" onClick={() => setModal(null)}>继续学习</button><button className="primary-button" onClick={() => { setExited(true); setModal(null); setToast('') }}>确认退出</button></div></> : modal === '课堂设置' ? <><p className="muted-copy">以下仅改变本次前端演示，不访问任何设备。</p><label className="setting-row"><span>显示中文翻译</span><input type="checkbox" checked={translate} onChange={e => setTranslate(e.target.checked)}/></label><div className="setting-row"><span>语音交互</span><strong>连续语音 · 状态模拟</strong></div><div className="setting-row"><span>Emma 展示</span><span>原图静态裁切 + CSS 微动</span></div><p className="notice-copy">AI、语音、摄像头及后台尚未接入。</p></> : modal === '课程目录' ? <><p className="muted-copy">Lesson 01 · Animals — 本阶段只提供动物识词练习。</p><div className="directory-list">{mockLesson.steps.map((s, i) => <button key={i} onClick={() => { goStep(i); setModal(null) }}><span className="step-number">{i + 1}</span><span>{s.title}</span>{step === i ? <Check size={21}/> : <ArrowRight size={19}/>}</button>)}</div><p className="notice-copy">发音纠正、报告及长期档案待 M1 验收后开发。</p></> : modal === '摄像头' ? <><div className="modal-illustration"><Settings2 size={34}/></div><p>摄像头尚未接入。</p><p className="muted-copy">本阶段不会请求摄像头或麦克风权限，底部只展示模拟状态。</p></> : <><div className="modal-illustration"><BookOpen size={34}/></div><p>「{modal}」待开发。</p><p className="muted-copy">当前仅实现 M1 英语课堂与动物识词，验收前不进入下一阶段。</p><button className="primary-button" onClick={() => setModal(null)}>返回课堂 <ArrowRight size={18}/></button></>}
    </Modal>}
  </div>
}
