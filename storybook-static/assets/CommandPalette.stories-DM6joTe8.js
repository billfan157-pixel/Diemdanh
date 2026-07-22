import{i as h,a as m,b as s}from"./iframe-CT42YBi6.js";import{e as u}from"./class-map-BOhrJ1Y0.js";import{e as v,n as f}from"./ref-ETtnilHd.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const r=class r extends h{constructor(){super(),this._inputRef=v(),this._search="",this._activeIdx=0,this.open=!1,this.commands=[]}updated(e){e.has("open")&&this.open&&(this._search="",this._activeIdx=0,requestAnimationFrame(()=>{var t;(t=this._inputRef.value)==null||t.focus()}))}_filtered(){if(!this._search.trim())return this.commands;const e=this._search.toLowerCase().trim();return this.commands.filter(t=>{var a,n;return t.label.toLowerCase().includes(e)||((a=t.description)==null?void 0:a.toLowerCase().includes(e))||((n=t.keywords)==null?void 0:n.some(p=>p.toLowerCase().includes(e)))})}_onInput(e){this._search=e.target.value,this._activeIdx=0}_onKeyDown(e){const t=this._filtered();e.key==="ArrowDown"?(e.preventDefault(),this._activeIdx=Math.min(this._activeIdx+1,t.length-1)):e.key==="ArrowUp"?(e.preventDefault(),this._activeIdx=Math.max(this._activeIdx-1,0)):e.key==="Enter"&&t[this._activeIdx]?this._select(t[this._activeIdx]):e.key==="Escape"&&this._close()}_select(e){this._close(),this.dispatchEvent(new CustomEvent("gl-palette-select",{detail:{commandId:e.id},bubbles:!0,composed:!0}))}_close(){this.dispatchEvent(new CustomEvent("gl-close",{bubbles:!0,composed:!0}))}_onOverlayClick(e){e.target===e.currentTarget&&this._close()}render(){if(!this.open)return s``;const e=this._filtered();return s`
      <div class="overlay" @click=${this._onOverlayClick}>
        <div class="dialog" role="dialog" aria-label="Command palette">
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              class="search-input"
              placeholder="Tìm lệnh, lớp, học viên..."
              ${f(this._inputRef)}
              @input=${this._onInput}
              @keydown=${this._onKeyDown}
            >
            <span class="shortcut-hint">Esc</span>
          </div>
          <div class="results">
            ${e.length===0?s`<div class="empty">Không tìm thấy kết quả</div>`:e.map((t,a)=>s`
              <button
                class="result-item ${u({active:a===this._activeIdx})}"
                @click=${()=>this._select(t)}
                @mouseenter=${()=>{this._activeIdx=a}}
              >
                <span class="result-icon">${t.icon||"📌"}</span>
                <div>
                  <div class="result-label">${t.label}</div>
                  ${t.description?s`<div class="result-desc">${t.description}</div>`:""}
                </div>
              </button>
            `)}
          </div>
        </div>
      </div>
    `}};r.styles=m`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: var(--z-modal, 1000);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 10vh;
    }
    .dialog {
      width: 100%;
      max-width: 520px;
      background: var(--color-bg-elevated);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      animation: drop-in 0.15s ease-out;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    .search-icon { font-size: 1.1rem; color: var(--color-text-secondary); flex-shrink: 0; }
    .search-input {
      flex: 1;
      border: none;
      background: none;
      font-size: var(--font-size-base);
      font-weight: 600;
      outline: none;
      color: var(--color-text);
    }
    .search-input::placeholder { color: var(--color-text-tertiary); }
    .shortcut-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      background: var(--color-bg-hover);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }
    .results { max-height: 360px; overflow-y: auto; padding: var(--space-1); }
    .empty {
      text-align: center;
      padding: var(--space-6);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
    }
    .result-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }
    .result-item:hover,
    .result-item.active { background: var(--color-bg-hover); }
    .result-icon { font-size: 1.1rem; flex-shrink: 0; }
    .result-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .result-desc { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

    @keyframes drop-in { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 767px) {
      .overlay { padding-top: 0; align-items: center; }
      .dialog { max-width: 100%; margin: var(--space-4); border-radius: var(--radius-lg); }
    }
  `,r.properties={open:{type:Boolean},commands:{type:Array}};let o=r;customElements.define("gl-command-palette",o);const k={title:"CommandPalette",component:"gl-command-palette"},g=[{id:"go-classes",label:"Đến lớp học",description:"Chuyển đến danh sách lớp",icon:"📚"},{id:"go-dashboard",label:"Tổng quan",description:"Xem thống kê",icon:"📊"},{id:"add-student",label:"Thêm học viên",description:"Thêm học viên mới vào lớp",icon:"➕"},{id:"import-excel",label:"Nhập từ Excel",description:"Nhập danh sách từ file Excel",icon:"📄"},{id:"export",label:"Xuất báo cáo",description:"In / xuất danh sách",icon:"🖨️"},{id:"settings",label:"Cài đặt",description:"Mở trang cài đặt",icon:"⚙️"}],i={render:()=>s`<gl-command-palette open .commands=${g}></gl-command-palette>`};var c,l,d;i.parameters={...i.parameters,docs:{...(c=i.parameters)==null?void 0:c.docs,source:{originalSource:"{\n  render: () => html`<gl-command-palette open .commands=${commands}></gl-command-palette>`\n}",...(d=(l=i.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};const $=["Default"];export{i as Default,$ as __namedExportsOrder,k as default};
