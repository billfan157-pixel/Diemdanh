import{i as d,a as b,b as t}from"./iframe-CT42YBi6.js";import"./preload-helper-C1FmrZbK.js";const r=class r extends d{constructor(){super(),this.title="",this.subtitle="",this.showMenu=!1}_handleMenu(){this.dispatchEvent(new CustomEvent("gl-menu-toggle",{bubbles:!0,composed:!0}))}render(){return t`
      ${this.showMenu?t`
        <button class="menu-btn" @click=${this._handleMenu} aria-label="Menu">
          <slot name="menu-icon">☰</slot>
        </button>
      `:""}
      <div class="title">
        ${this.title}
        ${this.subtitle?t`<span class="title-sub">${this.subtitle}</span>`:""}
      </div>
      <slot name="actions"></slot>
    `}};r.styles=b`
    :host {
      display: flex;
      align-items: center;
      height: var(--topbar-height, 60px);
      padding: 0 var(--space-5);
      background: var(--glass-bg);
      backdrop-filter: var(--glass-blur);
      -webkit-backdrop-filter: var(--glass-blur);
      border-bottom: 1px solid var(--glass-border);
      box-shadow: var(--shadow-sm);
      gap: var(--space-4);
      z-index: var(--z-sticky, 100);
      position: sticky;
      top: 0;
      transition: background-color var(--duration-normal) var(--easing-standard);
    }
    .title {
      font-family: var(--font-family-display);
      font-size: var(--font-size-lg);
      font-weight: 800;
      letter-spacing: -0.02em;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .title-sub {
      font-family: var(--font-family);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-gold);
      display: inline-block;
      margin-top: 1px;
      letter-spacing: 0.02em;
    }
    ::slotted([slot=actions]) {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .menu-btn {
      display: none;
      background: var(--color-bg-hover);
      border: 1px solid var(--color-border);
      font-size: 1.2rem;
      cursor: pointer;
      padding: var(--space-2);
      color: var(--color-text);
      border-radius: var(--radius-md);
      transition: all var(--duration-fast) var(--easing-standard);
    }
    .menu-btn:hover {
      background: var(--color-primary-soft);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }

    @media (max-width: 767px) {
      :host {
        padding: 0 var(--space-3);
        height: var(--mobile-topbar-height, 58px);
      }
      .menu-btn { display: inline-flex; }
    }
  `,r.properties={title:{type:String},subtitle:{type:String},showMenu:{type:Boolean}};let s=r;customElements.define("gl-topbar",s);const h={title:"TopBar",component:"gl-topbar",argTypes:{title:{control:"text"},subtitle:{control:"text"},showMenu:{control:"boolean"}},args:{title:"Sổ Điểm Giáo Lý",subtitle:"Năm 2025-2026",showMenu:!0}},e={render:a=>t`
    <gl-topbar .title=${a.title} .subtitle=${a.subtitle} .showMenu=${a.showMenu}>
      <gl-button slot="actions" variant="ghost">Lưu</gl-button>
    </gl-topbar>
  `},o={render:()=>t`
    <gl-topbar title="Lớp Giáo Lý 1"></gl-topbar>
  `};var i,n,l;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: (args: Record<string, unknown>) => html\`
    <gl-topbar .title=\${args.title as string} .subtitle=\${args.subtitle as string} .showMenu=\${args.showMenu as boolean}>
      <gl-button slot="actions" variant="ghost">Lưu</gl-button>
    </gl-topbar>
  \`
}`,...(l=(n=e.parameters)==null?void 0:n.docs)==null?void 0:l.source}}};var c,p,u;o.parameters={...o.parameters,docs:{...(c=o.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => html\`
    <gl-topbar title="Lớp Giáo Lý 1"></gl-topbar>
  \`
}`,...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};const v=["Default","NoSubtitle"];export{e as Default,o as NoSubtitle,v as __namedExportsOrder,h as default};
