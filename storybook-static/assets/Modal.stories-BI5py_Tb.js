import{i as h,a as u,b as o}from"./iframe-CT42YBi6.js";import{e as r}from"./class-map-BOhrJ1Y0.js";import"./Button-xEv75nIt.js";import"./preload-helper-C1FmrZbK.js";import"./directive-CJw_OlP2.js";import"./if-defined-D_MhRTYw.js";const l=class l extends h{constructor(){super(),this.open=!1,this.size="md",this.heading="",this.subtitle="",this.closable=!0}_onClose(){this.open=!1,this.dispatchEvent(new CustomEvent("gl-close",{bubbles:!0,composed:!0}))}_onOverlayClick(t){this.closable&&t.target.classList.contains("modal-overlay")&&this._onClose()}_onKeydown(t){t.key==="Escape"&&this.closable&&this._onClose()}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._onKeydown.bind(this))}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this._onKeydown.bind(this))}render(){const t={"modal-panel":!0,"modal-panel-sm":this.size==="sm","modal-panel-md":this.size==="md","modal-panel-lg":this.size==="lg"};return o`
      <div
        class="modal-overlay ${r({hidden:!this.open})}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        @click=${this._onOverlayClick}
      >
        <div class=${r(t)}>
          <div class="modal-head">
            <div>
              <h3 id="modal-title">${this.heading}</h3>
              ${this.subtitle?o`<p class="modal-sub">${this.subtitle}</p>`:""}
            </div>
            ${this.closable?o`
              <button type="button" class="modal-close" @click=${this._onClose} aria-label="Đóng">×</button>
            `:""}
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-foot" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `}};l.styles=u`
    :host { display: contents; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      background: rgba(15, 23, 42, 0.5);
      -webkit-backdrop-filter: blur(4px);
      backdrop-filter: blur(4px);
      animation: fade-in var(--duration-fast) var(--easing-standard);
    }
    .modal-overlay.hidden { display: none; }
    .modal-panel {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      animation: dialogPop var(--duration-normal) var(--easing-spring);
    }
    .modal-panel-sm { max-width: 400px; }
    .modal-panel-md { max-width: 520px; }
    .modal-panel-lg { max-width: 720px; }
    .modal-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5) var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }
    .modal-head h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .modal-sub {
      margin: 2px 0 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .modal-body {
      padding: var(--space-4) var(--space-5);
      overflow-y: auto;
      flex: 1;
    }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      border-top: 1px solid var(--color-border);
    }
    .modal-close {
      width: var(--touch-target-min);
      height: var(--touch-target-min);
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1.3rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .modal-close:hover { background: var(--color-bg-hover); }

    @media (max-width: 767px) {
      .modal-overlay { align-items: flex-end; padding: 0; padding-top: env(safe-area-inset-top); }
      .modal-panel {
        max-width: 100% !important;
        max-height: 85vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      }
    }

    @keyframes fade-in {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes dialogPop {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `,l.properties={open:{type:Boolean,reflect:!0},size:{type:String},heading:{type:String},subtitle:{type:String},closable:{type:Boolean}};let s=l;customElements.define("gl-modal",s);const z={title:"Modal",component:"gl-modal",argTypes:{open:{control:"boolean"},size:{control:"select",options:["sm","md","lg"]},heading:{control:"text"},subtitle:{control:"text"},closable:{control:"boolean"}},args:{open:!0,size:"md",heading:"Thêm học viên",subtitle:"Nhập thông tin học viên mới",closable:!0}},a={render:e=>o`
    <gl-modal
      ?open=${e.open}
      size=${e.size}
      heading=${e.heading}
      subtitle=${e.subtitle}
      ?closable=${e.closable}
    >
      <p>Nội dung modal ở đây.</p>
      <gl-button slot="footer" variant="primary">Lưu</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  `},n={render:()=>o`
    <gl-modal open size="sm" heading="Xác nhận" subtitle="Bạn có chắc chắn?">
      <p>Hành động này không thể hoàn tác.</p>
      <gl-button slot="footer" variant="danger">Xóa</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  `};var i,d,c;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: args => html\`
    <gl-modal
      ?open=\${args.open}
      size=\${args.size}
      heading=\${args.heading}
      subtitle=\${args.subtitle}
      ?closable=\${args.closable}
    >
      <p>Nội dung modal ở đây.</p>
      <gl-button slot="footer" variant="primary">Lưu</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  \`
}`,...(c=(d=a.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};var m,p,g;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => html\`
    <gl-modal open size="sm" heading="Xác nhận" subtitle="Bạn có chắc chắn?">
      <p>Hành động này không thể hoàn tác.</p>
      <gl-button slot="footer" variant="danger">Xóa</gl-button>
      <gl-button slot="footer" variant="ghost">Hủy</gl-button>
    </gl-modal>
  \`
}`,...(g=(p=n.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};const w=["Default","Small"];export{a as Default,n as Small,w as __namedExportsOrder,z as default};
