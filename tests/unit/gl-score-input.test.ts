import { html, fixture, expect } from '@open-wc/testing'
import '../../src/ui/views/components/gl-score-input'
import type { GlScoreInput } from '../../src/ui/views/components/gl-score-input'

describe('GlScoreInput', () => {
  it('renders empty state when scores is empty', async () => {
    const el = await fixture<GlScoreInput>(html`
      <gl-score-input studentId="s1" columnKey="kk" columnLabel="Khảo Kinh" columnShort="KK" .weight=${2} .scores=${[]}></gl-score-input>
    `)
    expect(el.querySelector('.is-empty')).to.exist
    expect(el.querySelector('.is-miss')).to.exist
    expect(el.querySelector('.chips')).to.be.null
  })

  it('renders score chips when scores are provided', async () => {
    const el = await fixture<GlScoreInput>(html`
      <gl-score-input studentId="s1" columnKey="kk" columnLabel="Khảo Kinh" columnShort="KK" .weight=${2} .scores=${[8, 9]}></gl-score-input>
    `)
    expect(el.querySelector('.is-empty')).to.be.null
    const chips = el.querySelectorAll('.chip')
    expect(chips.length).to.equal(2)
    expect(chips[0]!.textContent).to.include('8.00')
    expect(chips[1]!.textContent).to.include('9.00')
  })

  it('shows average when multiple scores', async () => {
    const el = await fixture<GlScoreInput>(html`
      <gl-score-input .scores=${[7, 9]}></gl-score-input>
    `)
    const avgEl = el.querySelector('.se-cell-val.is-avg')
    expect(avgEl).to.exist
    expect(avgEl!.textContent).to.include('8.00')
  })

  it('renders add-score input and button', async () => {
    const el = await fixture<GlScoreInput>(html`<gl-score-input studentId="s1" columnKey="kk"></gl-score-input>`)
    const input = el.querySelector<HTMLInputElement>('[data-score-input]')
    expect(input).to.exist
    expect(input!.dataset.sid).to.equal('s1')
    expect(input!.dataset.col).to.equal('kk')
    const addBtn = el.querySelector('[data-add-score]')
    expect(addBtn).to.exist
  })

  it('renders delete buttons on each chip', async () => {
    const el = await fixture<GlScoreInput>(html`
      <gl-score-input .scores=${[8, 7.5]}></gl-score-input>
    `)
    const delBtns = el.querySelectorAll('[data-del-score]')
    expect(delBtns.length).to.equal(2)
    expect(delBtns[0]!.getAttribute('data-idx')).to.equal('0')
    expect(delBtns[1]!.getAttribute('data-idx')).to.equal('1')
  })

  it('updates when scores property changes', async () => {
    const el = await fixture<GlScoreInput>(html`<gl-score-input .scores=${[5]}></gl-score-input>`)
    expect(el.querySelectorAll('.chip').length).to.equal(1)
    el.scores = [5, 6, 7]
    await el.updateComplete
    expect(el.querySelectorAll('.chip').length).to.equal(3)
  })
})
