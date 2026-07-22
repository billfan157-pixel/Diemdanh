import { html, fixture, expect } from '@open-wc/testing'
import '../../src/ui/views/components/gl-student-list'
import type { GlStudentList } from '../../src/ui/views/components/gl-student-list'
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
    hk1: { khaoKinh: [8], thuocBai: [7], chuyenCan: [9] },
    hk2: {},
  },
  ...overrides,
})

const cols: ScoreColumnDef[] = [
  { key: 'khaoKinh', label: 'Khảo Kinh', short: 'KK', defaultWeight: 1 },
  { key: 'thuocBai', label: 'Thuộc Bài', short: 'TB', defaultWeight: 1 },
  { key: 'chuyenCan', label: 'Chuyên Cần', short: 'CC', defaultWeight: 1 },
]

describe('GlStudentList', () => {
  it('renders student items', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent()]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const items = el.querySelectorAll('.cv-student-item')
    expect(items.length).to.equal(1)
  })

  it('renders student name in each item', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent()]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const name = el.querySelector('.cv-student-name')
    expect(name).to.exist
    expect(name!.textContent).to.include('Nguyễn Văn An')
  })

  it('renders TB score', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent()]} .cols=${cols} .weights=${{ khaoKinh: 1, thuocBai: 1, chuyenCan: 1 }} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const tb = el.querySelector('.cv-student-tb')
    expect(tb).to.exist
    expect(tb!.textContent).to.include('8.00')
  })

  it('renders avatar with initial letter', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent({ tenThanh: 'Maria', ten: 'Hồng' })]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const avatar = el.querySelector('.cv-student-avatar')
    expect(avatar).to.exist
    expect(avatar!.textContent).to.include('M')
  })

  it('shows total count in header', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent(), makeStudent({ id: 'st2', ten: 'Bình' })]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${2}></gl-student-list>
    `)
    const header = el.querySelector('.cv-side-header')
    expect(header).to.exist
    expect(header!.textContent).to.include('2')
  })

  it('filters students when filter input changes', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[
        makeStudent({ id: 'st1', ten: 'An' }),
        makeStudent({ id: 'st2', ten: 'Bình' }),
      ]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${2}></gl-student-list>
    `)
    const input = el.querySelector('input[type="text"]') as HTMLInputElement
    expect(input).to.exist
    input.value = 'Bình'
    input.dispatchEvent(new Event('input'))
    await el.updateComplete
    const items = el.querySelectorAll('.cv-student-item')
    expect(items.length).to.equal(1)
    expect(items[0]!.textContent).to.include('Bình')
  })

  it('shows empty hint when no results match filter', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent()]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const input = el.querySelector('input[type="text"]') as HTMLInputElement
    expect(input).to.exist
    input.value = 'xyz_notfound'
    input.dispatchEvent(new Event('input'))
    await el.updateComplete
    const hint = el.querySelector('.hint')
    expect(hint).to.exist
    expect(hint!.textContent).to.include('Không tìm thấy')
  })

  it('setActiveId updates active highlight', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[
        makeStudent({ id: 'st1', ten: 'An' }),
        makeStudent({ id: 'st2', ten: 'Bình' }),
      ]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${2}></gl-student-list>
    `)
    el.setActiveId('st1')
    await el.updateComplete
    const items = el.querySelectorAll('.cv-student-item')
    expect(items[0]!.classList.contains('active')).to.be.true
    expect(items[1]!.classList.contains('active')).to.be.false
  })

  it('dispatches student-select event on item click', async () => {
    const el = await fixture<GlStudentList>(html`
      <gl-student-list .students=${[makeStudent()]} .cols=${cols} .weights=${{}} term="hk1" .totalCount=${1}></gl-student-list>
    `)
    const item = el.querySelector('.cv-student-item') as HTMLElement
    let detail: any = null
    el.addEventListener('student-select', ((e: CustomEvent) => { detail = e.detail }) as EventListener)
    item.click()
    expect(detail).to.not.be.null
    expect(detail!.studentId).to.equal('st1')
  })
})
