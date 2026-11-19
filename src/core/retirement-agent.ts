import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import OpenAI from 'openai'
import type { QuickProfile } from './model'

export type AgentSource = { title: string; url: string }
export type AgentResult = { answer: string; sources: AgentSource[] }
export type QuickProfileDraft = {
  monthlyIncome: number | null
  workYears: number | null
  propertyValue: number | null
  propertyRegion: string | null
  propertyType: string | null
  monthlyRent: number | null
  stocks: { ticker: string; shares: number }[]
}

export async function parseQuickProfile(apiKey: string, roughInput: string): Promise<QuickProfileDraft> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: `사용자가 적은 금융 현황 문장에서 명시된 값만 추출해 JSON으로 정리하세요. 금액 단위가 명시되거나 문맥상 한국 원화일 때만 원으로 환산합니다. 모르는 값이나 추측이 필요한 값은 null로 둡니다. 주식은 종목 티커와 보유 수량만 추출합니다. 설명이나 조언은 하지 마세요.\n\n사용자 입력:\n${roughInput}`,
    text: {
      format: {
        type: 'json_schema',
        name: 'quick_financial_profile',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            monthlyIncome: { type: ['number', 'null'] },
            workYears: { type: ['number', 'null'] },
            propertyValue: { type: ['number', 'null'] },
            propertyRegion: { type: ['string', 'null'] },
            propertyType: { type: ['string', 'null'] },
            monthlyRent: { type: ['number', 'null'] },
            stocks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { ticker: { type: 'string' }, shares: { type: 'number' } }, required: ['ticker', 'shares'] } },
          },
          required: ['monthlyIncome', 'workYears', 'propertyValue', 'propertyRegion', 'propertyType', 'monthlyRent', 'stocks'],
        },
      },
    },
  })
  if (!response.output_text) throw new Error('정리된 입력을 받지 못했습니다.')
  return JSON.parse(response.output_text) as QuickProfileDraft
}

const AgentState = Annotation.Root({
  profile: Annotation<QuickProfile>,
  question: Annotation<string>,
  history: Annotation<string>,
  searches: Annotation<string[]>({ value: (left, right) => right ?? left, default: () => [] }),
  answer: Annotation<string>({ value: (left, right) => right ?? left, default: () => '' }),
  sources: Annotation<AgentSource[]>({ value: (left, right) => right ?? left, default: () => [] }),
})

function makeSearches(profile: QuickProfile, question: string) {
  const searches = profile.stocks.filter(s => s.ticker.trim() && s.shares > 0)
    .slice(0, 8).map(s => `${s.ticker} latest annual dividend per share dividend history official investor relations`)
  if (profile.propertyValue > 0 && !profile.monthlyRent) {
    searches.push(profile.propertyRegion.trim()
      ? `${profile.propertyRegion} ${profile.propertyType} typical gross monthly rent rental yield South Korea latest`
      : `South Korea ${profile.propertyType} average gross rental yield monthly rent latest data`)
  }
  if (profile.workYears > 0) searches.push('site:nps.or.kr 국민연금 평균 노령연금 월 수령액 통계 최신')
  if (question.trim()) searches.push(question.trim())
  return [...new Set(searches)]
}

function responseSources(response: unknown): AgentSource[] {
  const output = (response as { output?: Array<{ content?: Array<{ annotations?: Array<{ type?: string; title?: string; url?: string }> }> }> }).output || []
  const sources: AgentSource[] = []
  for (const item of output) for (const part of item.content || []) for (const citation of part.annotations || []) {
    if (citation.type === 'url_citation' && citation.url && !sources.some(s => s.url === citation.url)) {
      sources.push({ title: citation.title || citation.url, url: citation.url })
    }
  }
  return sources
}

export async function runRetirementAgent(apiKey: string, profile: QuickProfile, question: string, history: string): Promise<AgentResult> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const graph = new StateGraph(AgentState)
    .addNode('plan_research', async state => ({ searches: makeSearches(state.profile, state.question) }))
    .addNode('research_and_estimate', async state => {
      const stocks = state.profile.stocks.filter(s => s.ticker.trim() && s.shares > 0)
      const userProfile = {
        monthlyTakeHomeIncomeKRW: state.profile.monthlyIncome,
        yearsWorked: state.profile.workYears,
        property: state.profile.propertyValue > 0 ? {
          valueKRW: state.profile.propertyValue,
          propertyType: state.profile.propertyType,
          region: state.profile.propertyRegion || 'not supplied',
          knownMonthlyRentKRW: state.profile.monthlyRent || null,
        } : null,
        stocks,
      }
      const prompt = `You are a cautious Korean retirement cash-flow research assistant. The user explicitly asked for an approximate monthly cash-flow estimate using online research. Research queries to answer: ${JSON.stringify(state.searches)}.

User-provided numbers (treat these as inputs, never as verified market facts): ${JSON.stringify(userProfile)}
Follow-up question: ${state.question || '(none)'}
Prior conversation: ${state.history || '(none)'}

Use web search. Respond in Korean. Start with a compact monthly cash-flow breakdown in KRW, separating current take-home pay, sourced stock dividends averaged monthly, and rent (use user-entered rent if provided; otherwise estimate only if you find a location/property-relevant rental yield source). Do not count property value itself as monthly income. For foreign stock dividends, convert only if you find and cite a current FX rate; otherwise keep that amount in its original currency and exclude it from the KRW total. Clearly label gross/net and current/estimated amounts. Do not invent missing dividend rates, rental yields, exchange rates, national pension benefits, or taxes. If a value cannot be sourced, say so and leave it out of the total.

Years worked alone cannot determine this person's National Pension benefit. If you find a recent official National Pension Service average, show it only as a population benchmark, never as this user's personal estimate. Include source publication/access dates when available, describe assumptions and uncertainty, and do not recommend investments. Finish with a simple formula for the total. Keep the response concise and make clear that this is a rough scenario, not a guaranteed income forecast.`
      const response = await client.responses.create({
        model: 'gpt-4.1-mini',
        tools: [{ type: 'web_search' }],
        input: prompt,
      })
      return { answer: response.output_text || '웹 자료에서 추정에 필요한 정보를 찾지 못했습니다.', sources: responseSources(response) }
    })
    .addEdge(START, 'plan_research')
    .addEdge('plan_research', 'research_and_estimate')
    .addEdge('research_and_estimate', END)
    .compile()

  const result = await graph.invoke({ profile, question, history })
  return { answer: result.answer, sources: result.sources }
}
