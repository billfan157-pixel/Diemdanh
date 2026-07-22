import { html, fixture, expect } from '@open-wc/testing'
import '../../src/ui/views/components/gl-student-row'
import type { GlStudentRow } from '../../src/ui/views/components/gl-student-row'
import type { StudentData, ScoreColumnDef } from '../../src/services/storage/StorageAdapter.types'

const makeStudent = (overrides?: Partial<StudentData>): StudentData => ({
  id: 'st1',
  tenThanh: 'Phêrô',
  hoDem: 'Nguyễn Văn',
  ten: 'An',
  name: '',
  maHV: 'HV001',
  ghiChu: '',
  scoresByTerm: {
    hk1: { khaoKinh: [8, 9], thuocBai: [7], chuyenCan: [10] },
    hk2: {},
  },
  ...overrides,
})

const cols: ScoreColumnDef[] = [
  { key: 'khaoKinh', label: 'Khảo Kinh', short: 'KK', defaultWeight: 2 },
  { key: 'thuocBai', label: 'Thuộc Bài', short: 'TB', defaultWeight: 1 },
  { key: 'chuyenCan', label: 'Chuyên Cần', short: 'CC', defaultWeight: 1 },
]

describe('GlStudentRow', () => {
  it('renders a tr with data-id', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{ khaoKinh: 2, thuocBai: 1, chuyenCan: 1 }} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr[data-id="st1"]')
    expect(tr).to.exist
  })

  it('renders STT number', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${5} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr')!
    const tds = tr.querySelectorAll('td')
    expect(tds[1]!.textContent).to.include('6')
  })

  it('renders student name', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr')!
    const tds = tr.querySelectorAll('td')
    expect(tds[2]!.textContent).to.include('Nguyễn Văn')
    expect(tds[3]!.textContent).to.include('An')
  })

  it('renders score inputs with data-table-score', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const inputs = el.querySelectorAll<HTMLInputElement>('[data-table-score]')
    expect(inputs.length).to.equal(3)
    expect(inputs[0]!.dataset.sid).to.equal('st1')
    expect(inputs[0]!.dataset.col).to.equal('khaoKinh')
  })

  it('shows checkbox with selected state', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${true}></gl-student-row>
    `)
    const cb = el.querySelector<HTMLInputElement>('.student-select')
    expect(cb!.checked).to.be.true
  })

  it('shows unchecked checkbox when not selected', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const cb = el.querySelector<HTMLInputElement>('.student-select')
    expect(cb!.checked).to.be.false
  })

  it('renders TB score cell', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{ khaoKinh: 2, thuocBai: 1, chuyenCan: 1 }} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const tbCell = el.querySelector('.tb-cell')
    expect(tbCell).to.exist
    expect(tbCell!.textContent).to.include('8.50')
  })

  it('renders ghiChu cell', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent({ ghiChu: 'Học tốt' })} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr')!
    const tds = tr.querySelectorAll('td')
    const lastTd = tds[tds.length - 1]
    expect(lastTd.textContent).to.include('Học tốt')
  })

  it('renders draggable attribute', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr')!
    expect(tr.draggable).to.be.true
  })

  it('renders detail row when expanded', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false} .expanded=${true}></gl-student-row>
    `)
    const detailTr = el.querySelector('tr.detail-row')
    expect(detailTr).to.exist
    expect(detailTr!.getAttribute('data-detail-for')).to.equal('st1')
  })

  it('toggleExpand toggles expanded property', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    expect(el.expanded).to.be.false
    expect(el.querySelector('tr.detail-row')).to.be.null
    el.toggleExpand()
    await el.updateComplete
    expect(el.expanded).to.be.true
    expect(el.querySelector('tr.detail-row')).to.exist
  })

  it('applies stagger animation style', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${3} .selected=${false}></gl-student-row>
    `)
    const tr = el.querySelector('tr')!
    expect(tr.classList.contains('stagger-enter')).to.be.true
    expect(tr.style.animationDelay).to.include('90')
  })

  it('renders empty when student is null', async () => {
    const el = await fixture<GlStudentRow>(html`<gl-student-row></gl-student-row>`)
    expect(el.querySelector('tr')).to.be.null
  })

  it('has display:contents style', async () => {
    const el = await fixture<GlStudentRow>(html`
      <gl-student-row .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .selected=${false}></gl-student-row>
    `)
    expect(el.style.display).to.equal('contents')
  })
})
