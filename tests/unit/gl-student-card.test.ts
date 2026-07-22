import { html, fixture, expect } from '@open-wc/testing'
import '../../src/ui/views/components/gl-student-card'
import '../../src/ui/views/components/gl-score-input'
import type { GlStudentCard } from '../../src/ui/views/components/gl-student-card'
import type { StudentData, ScoreColumnDef } from '../../src/services/storage/StorageAdapter.types'

const makeStudent = (overrides?: Partial<StudentData>): StudentData => ({
  id: 'st1',
  tenThanh: 'Phêrô',
  hoDem: 'Nguyễn Văn',
  ten: 'An',
  name: '',
  ngaySinh: '2010-05-15',
  scoresByTerm: {
    hk1: { khaoKinh: [8, 9], thuocBai: [7], chuyenCan: [10] },
    hk2: {},
  },
  ghiChu: '',
  ...overrides,
})

const cols: ScoreColumnDef[] = [
  { key: 'khaoKinh', label: 'Khảo Kinh', short: 'KK' },
  { key: 'thuocBai', label: 'Thuộc Bài', short: 'TB' },
  { key: 'chuyenCan', label: 'Chuyên Cần', short: 'CC' },
]

describe('GlStudentCard', () => {
  it('renders student identity', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{ khaoKinh: 2, thuocBai: 1, chuyenCan: 1 }} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('.se-ten-thanh')!.textContent).to.include('Phêrô')
    expect(el.querySelector('.se-ho-ten')!.textContent).to.include('Nguyễn Văn An')
    expect(el.querySelector('.stt-badge')!.textContent).to.include('1')
  })

  it('renders all gl-score-input sub-components', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{ khaoKinh: 2, thuocBai: 1, chuyenCan: 1 }} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    const scoreInputs = el.querySelectorAll('gl-score-input')
    expect(scoreInputs.length).to.equal(3)
  })

  it('renders TB score and classification', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{ khaoKinh: 2, thuocBai: 1, chuyenCan: 1 }} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('.tb-score')).to.exist
    expect(el.querySelector('.tb-rank')).to.exist
  })

  it('shows checkbox with selected state', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3} .selected=${true}></gl-student-card>
    `)
    const cb = el.querySelector<HTMLInputElement>('.student-select')
    expect(cb!.checked).to.be.true
  })

  it('shows unchecked checkbox when not selected', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3} .selected=${false}></gl-student-card>
    `)
    const cb = el.querySelector<HTMLInputElement>('.student-select')
    expect(cb!.checked).to.be.false
  })

  it('renders action buttons with correct data attributes', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('[data-move-student="st1"]')).to.exist
    expect(el.querySelector('[data-journal="st1"]')).to.exist
    expect(el.querySelector('[data-del-student="st1"]')).to.exist
  })

  it('renders empty when student is null', async () => {
    const el = await fixture<GlStudentCard>(html`<gl-student-card></gl-student-card>`)
    expect(el.querySelector('.score-card')).to.be.null
  })

  it('uses fallback name when tenThanh and hoTen are empty', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent({ tenThanh: '', hoDem: '', ten: '', name: 'John Doe' })} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('.se-ho-ten')!.textContent).to.include('John Doe')
  })

  it('shows ghiChu when present', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent({ ghiChu: 'Học muộn' })} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('.se-meta-info')).to.exist
    expect(el.querySelector('.se-meta-info')!.textContent).to.include('Học muộn')
  })

  it('updates when student property changes', async () => {
    const el = await fixture<GlStudentCard>(html`
      <gl-student-card .student=${makeStudent()} .cols=${cols} .weights=${{}} term="hk1" .index=${0} .totalCols=${3}></gl-student-card>
    `)
    expect(el.querySelector('.se-ten-thanh')!.textContent).to.include('Phêrô')
    el.student = makeStudent({ tenThanh: 'Maria', id: 'st2' })
    await el.updateComplete
    expect(el.querySelector('.se-ten-thanh')!.textContent).to.include('Maria')
  })
})
