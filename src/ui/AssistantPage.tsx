import { useEffect, useState } from 'react'
import { ArrowUpRight, Bot, ExternalLink, KeyRound, LoaderCircle, Plus, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import type { QuickProfile, QuickStock } from '../core/model'
import { parseQuickProfile, runRetirementAgent, type AgentSource } from '../core/retirement-agent'

type Message = { role: 'user' | 'assistant'; text: string; sources?: AgentSource[] }
const blankProfile: QuickProfile = { monthlyIncome: 0, workYears: 0, propertyValue: 0, propertyRegion: '', propertyType: '아파트', monthlyRent: 0, stocks: [{ ticker: '', shares: 0 }] }
const money = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value || 0)

export default function AssistantPage({ initialProfile, onSave }: { initialProfile: QuickProfile | null; onSave: (profile: QuickProfile) => Promise<boolean> }) {
  const [profile, setProfile] = useState<QuickProfile>(initialProfile || blankProfile)
  const [apiKey, setApiKey] = useState('')
  const [question, setQuestion] = useState('')
  const [roughInput, setRoughInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [consent, setConsent] = useState(false)
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => { if (initialProfile) setProfile(initialProfile) }, [initialProfile])
  const setField = (key: keyof QuickProfile, value: string | number) => setProfile(current => ({ ...current, [key]: value }))
  const updateStock = (index: number, key: keyof QuickStock, value: string | number) => setProfile(current => ({ ...current, stocks: current.stocks.map((stock, i) => i === index ? { ...stock, [key]: value } : stock) }))
  const addStock = () => setProfile(current => ({ ...current, stocks: [...current.stocks, { ticker: '', shares: 0 }] }))
  const removeStock = (index: number) => setProfile(current => ({ ...current, stocks: current.stocks.filter((_, i) => i !== index) }))

  async function makeDraft() {
    if (!roughInput.trim()) { setStatus('먼저 대략적인 금융 현황을 적어 주세요.'); return }
    if (!apiKey.trim()) { setStatus('초안 정리에는 OpenAI API 키가 필요합니다. 키는 저장하지 않습니다.'); return }
    if (!consent) { setStatus('초안 정리에 필요한 입력 문장의 OpenAI 전송에 동의해 주세요.'); return }
    setWorking(true); setStatus('입력 문장에서 명시된 값만 정리하고 있습니다…')
    try {
      const draft = await parseQuickProfile(apiKey.trim(), roughInput.trim())
      setProfile(current => ({
        monthlyIncome: draft.monthlyIncome ?? current.monthlyIncome,
        workYears: draft.workYears ?? current.workYears,
        propertyValue: draft.propertyValue ?? current.propertyValue,
        propertyRegion: draft.propertyRegion ?? current.propertyRegion,
        propertyType: draft.propertyType ?? current.propertyType,
        monthlyRent: draft.monthlyRent ?? current.monthlyRent,
        stocks: draft.stocks.length ? draft.stocks : current.stocks,
      }))
      setConsent(false)
      setStatus('입력값 초안을 만들었습니다. 아래 항목을 확인하고 수정한 뒤 로컬에 저장하세요. 아직 DB에는 저장되지 않았습니다.')
    } catch (error) {
      setStatus(`초안 정리에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally { setWorking(false) }
  }

  async function saveDraft() {
    const readyProfile = { ...profile, stocks: profile.stocks.filter(s => s.ticker.trim() && s.shares > 0) }
    setWorking(true)
    try {
      if (await onSave(readyProfile)) setStatus('확인한 입력값을 이 기기의 로컬 데이터베이스에 저장했습니다. 온라인 분석은 실행하지 않았습니다.')
      else setStatus('입력값을 로컬 데이터베이스에 저장하지 못했습니다.')
    } finally { setWorking(false) }
  }

  async function analyze(event: React.FormEvent) {
    event.preventDefault()
    if (!apiKey.trim()) { setStatus('OpenAI API 키를 입력해 주세요. 키는 이 화면에서만 사용하고 저장하지 않습니다.'); return }
    if (!consent) { setStatus('분석에 필요한 정보의 OpenAI 전송에 동의해 주세요.'); return }
    setWorking(true); setStatus('입력한 내용을 저장하고 공개 자료를 조사하고 있습니다…')
    const readyProfile = { ...profile, stocks: profile.stocks.filter(s => s.ticker.trim() && s.shares > 0) }
    try {
      if (!await onSave(readyProfile)) { setStatus('입력 내용을 로컬 데이터베이스에 저장하지 못했습니다.'); return }
      const history = messages.map(m => `${m.role === 'user' ? '사용자' : '도우미'}: ${m.text}`).join('\n\n')
      const result = await runRetirementAgent(apiKey.trim(), readyProfile, question, history)
      setMessages(current => [...current, ...(question.trim() ? [{ role: 'user' as const, text: question.trim() }] : []), { role: 'assistant', text: result.answer, sources: result.sources }])
      setQuestion(''); setConsent(false); setStatus('완료 · 결과는 공개 자료와 입력값을 바탕으로 한 대략적인 추정입니다.')
    } catch (error) {
      console.error(error)
      setStatus(`분석에 실패했습니다: ${error instanceof Error ? error.message : String(error)}. API 키, 계정의 API 사용 설정, 네트워크 연결을 확인해 주세요.`)
    } finally { setWorking(false) }
  }

  return <section className="page-section assistant-page">
    <div className="page-heading assistant-heading"><div><div className="eyebrow">QUICK ESTIMATE · OPENAI + LANGGRAPH</div><h1>은퇴 현금흐름 도우미</h1><p>이미 알고 있는 숫자만 입력하세요. 공개 자료를 찾아 월 현금흐름을 대략적으로 정리합니다.</p></div><span className="local-pill"><ShieldCheck size={14}/> 입력은 이 기기에 저장</span></div>
    <div className="assistant-layout">
      <form className="assistant-input-card" onSubmit={analyze}>
        <div className="assistant-card-title"><div className="assistant-icon"><Sparkles size={17}/></div><div><b>빠른 정보 입력</b><span>부담 없는 숫자부터 채우면 됩니다</span></div></div>
        <div className="rough-intake"><label className="field"><span>대략적으로 편하게 적어 보기 <em>AI가 입력칸에 초안을 채웁니다</em></span><textarea rows={4} value={roughInput} onChange={e=>setRoughInput(e.target.value)} placeholder="예: 월 실수령 450만 원, 12년 일했어요. 서울 마포구 아파트 시세는 8억 정도고, 삼성전자 30주와 애플 10주가 있어요."/></label><button type="button" className="button secondary" disabled={working} onClick={makeDraft}>{working?<LoaderCircle className="spin" size={14}/>:<Sparkles size={14}/>} 문장을 입력값 초안으로 정리</button><small>AI가 알아서 보충하지 않고, 문장에 적힌 값만 추립니다. 만든 초안은 아래에서 직접 고칠 수 있습니다.</small></div>
        <label className="field"><span>월 수입 (세후, 원)</span><input type="number" min="0" step="10000" value={profile.monthlyIncome||''} onChange={e=>setField('monthlyIncome',Number(e.target.value)||0)} placeholder="예: 4,000,000"/></label>
        <label className="field"><span>일한 기간 (년)</span><input type="number" min="0" max="60" step="1" value={profile.workYears||''} onChange={e=>setField('workYears',Number(e.target.value)||0)} placeholder="예: 15"/></label>
        <div className="assistant-divider">부동산 <small>선택 입력</small></div>
        <label className="field"><span>현재 시세 (원)</span><input type="number" min="0" step="10000000" value={profile.propertyValue||''} onChange={e=>setField('propertyValue',Number(e.target.value)||0)} placeholder="예: 600,000,000"/></label>
        {profile.propertyValue>0&&<>
          <div className="field-row"><label className="field"><span>지역 <em>선택</em></span><input value={profile.propertyRegion} onChange={e=>setField('propertyRegion',e.target.value)} placeholder="예: 서울 마포구"/></label><label className="field"><span>유형</span><select value={profile.propertyType} onChange={e=>setField('propertyType',e.target.value)}>{['아파트','빌라·다세대','단독주택','상가·오피스텔','기타'].map(x=><option key={x}>{x}</option>)}</select></label></div>
          <label className="field"><span>알고 있는 월세 (원) <em>있으면 입력 · 없으면 자료로 추정</em></span><input type="number" min="0" step="10000" value={profile.monthlyRent||''} onChange={e=>setField('monthlyRent',Number(e.target.value)||0)} placeholder="미입력 시 지역 평균 자료 탐색"/></label>
        </>}
        <div className="assistant-divider">보유 주식 <small>티커와 수량</small></div>
        <div className="quick-stock-list">{profile.stocks.map((stock,index)=><div className="quick-stock-row" key={index}><label className="field"><span>{index===0?'티커':'추가 티커'}</span><input value={stock.ticker} onChange={e=>updateStock(index,'ticker',e.target.value.toUpperCase())} placeholder="예: 005930.KS, AAPL"/></label><label className="field"><span>수량</span><input type="number" min="0" step="any" value={stock.shares||''} onChange={e=>updateStock(index,'shares',Number(e.target.value)||0)} placeholder="주"/></label><button className="stock-remove" type="button" title="행 삭제" onClick={()=>removeStock(index)} disabled={profile.stocks.length===1}><Trash2 size={14}/></button></div>)}</div>
        <button className="add-stock" type="button" onClick={addStock}><Plus size={14}/> 종목 추가</button>
        <button type="button" className="button secondary save-draft-button" disabled={working} onClick={saveDraft}>입력값만 로컬에 저장</button>
        <div className="api-key-field"><label className="field"><span><KeyRound size={13}/> OpenAI API 키 <em>이번 실행 동안만 사용</em></span><input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-…"/></label><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">API 키 페이지 <ExternalLink size={12}/></a></div>
        <label className="ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>입력 초안 정리를 누르면 위 문장만, 온라인 분석을 누르면 간편 프로필과 질문·대화 내용을 OpenAI로 보냅니다. 해당 버튼을 누를 때만 전송합니다. 이름, 계좌번호, 기존 DB 전체는 보내지 않습니다.</span></label>
        <button className="button primary analyze-button" disabled={working}><span>{working?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>}</span>{working?'자료 조사 중…':'현금흐름 분석하기'}</button>
        {status&&<div className={`assistant-status ${working?'busy':''}`}>{status}</div>}
      </form>
      <div className="assistant-results">
        <div className="assistant-result-header"><div className="bot-avatar"><Bot size={19}/></div><div><b>월 현금흐름 분석</b><span>OpenAI web search · LangGraph · 출처 링크 포함</span></div><span className="estimate-chip">대략적인 추정</span></div>
        {!messages.length?<div className="assistant-empty"><div className="assistant-empty-art"><Sparkles size={22}/></div><h3>쉬운 정보로 먼저 살펴볼게요</h3><p>월 수입은 현재 현금흐름으로, 주식 배당과 월세는 공개 자료를 확인해 별도의 추정으로 표시합니다.</p><div className="empty-prompt"><span>예상 응답</span><b>현재 수입 · 월세 · 월평균 배당 · 공개 연금 통계</b></div><small>월급과 투자 소득을 합산할 때 서로 다른 성격의 금액을 구분해 보여줍니다.</small></div>:<div className="assistant-messages">{messages.map((message,index)=><article className={`assistant-message ${message.role}`} key={index}><div className="message-label">{message.role==='user'?'내 질문':'분석 결과'}</div><div className="message-text">{message.text}</div>{!!message.sources?.length&&<div className="agent-sources"><span>참고한 공개 자료</span>{message.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12}/></a>)}</div>}</article>)}</div>}
        <div className="followup-box"><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="예: 배당이 20% 줄면 어떻게 되나요?" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="button" title="질문 보내기" disabled={working||!question.trim()} onClick={()=>document.querySelector<HTMLFormElement>('.assistant-input-card')?.requestSubmit()}><Send size={15}/></button></div>
        <p className="assistant-footnote">AI가 찾은 온라인 수치에는 시점·지역·상품별 차이가 있습니다. 세금과 수수료가 반영되지 않을 수 있으며, 국민연금 평균은 개인 예상액이 아닙니다.</p>
      </div>
    </div>
  </section>
}
