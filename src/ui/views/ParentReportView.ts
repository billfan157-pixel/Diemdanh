// ============================================================
// Read-only parent report view (Phase 3.4)
// ============================================================

import { StateManager } from '../StateManager'
import { buildParentReportCardHtml } from '../../features/parentReport.ts'

export class ParentReportView {
  private stateManager: StateManager
  private token: string

  constructor(stateManager: StateManager, token: string) {
    this.stateManager = stateManager
    this.token = token
  }

  render(): HTMLElement {
    const root = document.createElement('div')
    root.id = 'parentReportRoot'
    const result = this.stateManager.resolveParentTokenView(this.token)

    if (!result.ok || !result.classData || !result.student || !result.token) {
      root.innerHTML = `
        <div style="max-width:420px;margin:48px auto;padding:24px;font-family:system-ui,sans-serif;text-align:center">
          <h1 style="font-size:1.25rem">Không xem được phiếu điểm</h1>
          <p style="color:#666">${escapeHtml(result.error || 'Link không hợp lệ')}</p>
        </div>
      `
      return root
    }

    root.innerHTML = buildParentReportCardHtml(result.classData, result.student, result.token)
    return root
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
