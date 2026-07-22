import{i as l,a as c,b as r}from"./iframe-CT42YBi6.js";import{e as p}from"./class-map-BOhrJ1Y0.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";const o=class o extends l{constructor(){super(),this.open=!1,this.heading=""}_close(){this.dispatchEvent(new CustomEvent("gl-close",{bubbles:!0,composed:!0}))}_onOverlayClick(n){n.target===n.currentTarget&&this._close()}render(){return r`
      <div class="overlay ${p({hidden:!this.open})}" @click=${this._onOverlayClick}>
        <div class="sheet">
          <div class="handle"></div>
          ${this.heading?r`
            <div class="header">
              <span class="title">${this.heading}</span>
              <button class="close-btn" @click=${this._close} aria-label="Đóng">×</button>
            </div>
          `:""}
          <div class="body">
            <slot></slot>
          </div>
        </div>
      </div>
    `}};o.styles=c`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: var(--z-modal, 1000);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fade-in 0.15s ease-out;
    }
    .sheet {
      width: 100%;
      max-width: 480px;
      max-height: 80vh;
      background: var(--color-bg-elevated);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      display: flex;
      flex-direction: column;
      animation: slide-up 0.25s var(--easing-standard);
      overflow: hidden;
    }
    .handle {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: var(--color-border);
      margin: var(--space-2) auto;
      flex-shrink: 0;
    }
    .header {
      display: flex;
      align-items: center;
      padding: var(--space-2) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      gap: var(--space-2);
    }
    .title {
      flex: 1;
      font-size: var(--font-size-base);
      font-weight: 750;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: var(--space-1);
      border-radius: var(--radius-sm);
    }
    .close-btn:hover { background: var(--color-bg-hover); }
    .body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4);
    }
    .hidden { display: none; }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  `,o.properties={open:{type:Boolean},heading:{type:String}};let t=o;customElements.define("gl-bottom-sheet",t);const v={title:"BottomSheet",component:"gl-bottom-sheet",argTypes:{open:{control:"boolean"},heading:{control:"text"}},args:{open:!0,heading:"Chọn thao tác"}},e={render:a=>r`
    <gl-bottom-sheet .open=${a.open} .heading=${a.heading}>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Sửa thông tin</button>
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Xem chi tiết</button>
        <button style="padding:12px;border:1px solid var(--color-danger);border-radius:8px;background:none;cursor:pointer;color:var(--color-danger);">Xóa</button>
      </div>
    </gl-bottom-sheet>
  `};var s,d,i;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: (args: Record<string, unknown>) => html\`
    <gl-bottom-sheet .open=\${args.open as boolean} .heading=\${args.heading as string}>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Sửa thông tin</button>
        <button style="padding:12px;border:1px solid var(--color-border);border-radius:8px;background:none;cursor:pointer;">Xem chi tiết</button>
        <button style="padding:12px;border:1px solid var(--color-danger);border-radius:8px;background:none;cursor:pointer;color:var(--color-danger);">Xóa</button>
      </div>
    </gl-bottom-sheet>
  \`
}`,...(i=(d=e.parameters)==null?void 0:d.docs)==null?void 0:i.source}}};const x=["Default"];export{e as Default,x as __namedExportsOrder,v as default};
