import { LitElement, html, css } from 'lit'

export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  hideable?: boolean
}

export class GlTable extends LitElement {
  static styles = css`
    :host { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }
    thead { position: sticky; top: 0; z-index: 1; }
    th {
      background: var(--color-bg-soft);
      color: var(--color-text-secondary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: var(--font-size-xs);
      padding: var(--space-2) var(--space-3);
      text-align: left;
      white-space: nowrap;
      border-bottom: 2px solid var(--color-border);
    }
    td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-bg-hover); }
    .align-center { text-align: center; }
    .align-right { text-align: right; }
    .th-align-center { text-align: center; }
    .th-align-right { text-align: right; }

    @media (max-width: 767px) {
      th, td { padding: var(--space-1) var(--space-2); font-size: var(--font-size-xs); }
    }
  `

  static properties = {
    columns: { type: Array },
    rows: { type: Array },
  }

  declare columns: TableColumn[]
  declare rows: Record<string, unknown>[]

  constructor() {
    super()
    this.columns = []
    this.rows = []
  }

  render() {
    return html`
      <table>
        <thead>
          <tr>
            ${this.columns.map(col => html`
              <th class="th-align-${col.align || 'left'}" style=${col.width ? `width:${col.width}` : ''}>
                ${col.label}
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map(row => html`
            <tr>
              ${this.columns.map(col => html`
                <td class="align-${col.align || 'left'}">${row[col.key] ?? ''}</td>
              `)}
            </tr>
          `)}
        </tbody>
      </table>
    `
  }
}

customElements.define('gl-table', GlTable)

declare global {
  interface HTMLElementTagNameMap {
    'gl-table': GlTable
  }
}
